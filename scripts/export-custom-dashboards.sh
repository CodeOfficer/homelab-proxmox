#!/usr/bin/env bash
set -euo pipefail

# Export all custom (non-provisioned) Grafana dashboards to git
# Filters out dashboards managed by Helm provisioners (grafana.com imports, etc.)
# Run before rebuild to preserve manually created dashboards

KUBECONFIG="${KUBECONFIG:-infrastructure/terraform/kubeconfig}"
PASSWORD_FILE=".secrets/grafana-admin-password"
DASHBOARD_DIR="applications/monitoring/dashboards"

if [[ ! -f "$PASSWORD_FILE" ]]; then
    echo "ERROR: $PASSWORD_FILE not found"
    exit 1
fi

PASSWORD=$(cat "$PASSWORD_FILE")
AUTH_HEADER="Authorization: Basic $(echo -n "admin:${PASSWORD}" | base64)"

echo "Fetching dashboard list from Grafana..."

# Get all dashboard metadata
SEARCH_RESULT=$(kubectl exec -n monitoring deployment/monitoring-grafana -c grafana -- \
    wget -qO- --header "$AUTH_HEADER" \
    'http://localhost:3000/api/search?type=dash-db')

# Parse UIDs
DASHBOARD_UIDS=$(echo "$SEARCH_RESULT" | jq -r '.[].uid')

if [[ -z "$DASHBOARD_UIDS" ]]; then
    echo "No dashboards found"
    exit 0
fi

mkdir -p "$DASHBOARD_DIR"
EXPORTED=0
SKIPPED=0

# Export each dashboard
for uid in $DASHBOARD_UIDS; do
    # Fetch full dashboard with metadata
    FULL_JSON=$(kubectl exec -n monitoring deployment/monitoring-grafana -c grafana -- \
        wget -qO- --header "$AUTH_HEADER" \
        "http://localhost:3000/api/dashboards/uid/${uid}")

    # Check if provisioned (skip if managed by Helm)
    PROVISIONED=$(echo "$FULL_JSON" | jq -r '.meta.provisioned // false')

    if [[ "$PROVISIONED" == "true" ]]; then
        TITLE=$(echo "$FULL_JSON" | jq -r '.dashboard.title')
        echo "SKIP (provisioned): $TITLE"
        ((SKIPPED++)) || true
        continue
    fi

    # Extract dashboard and title
    DASHBOARD=$(echo "$FULL_JSON" | jq '.dashboard')
    TITLE=$(echo "$DASHBOARD" | jq -r '.title')

    # Generate safe filename from UID (use UID not title to avoid conflicts)
    FILENAME="${uid}.yaml"

    # Create ConfigMap
    cat > "${DASHBOARD_DIR}/${FILENAME}" <<EOF
# Grafana Dashboard: ${TITLE}
# UID: ${uid}
# Auto-exported by scripts/export-custom-dashboards.sh
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-${uid}
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dashboard.json: |
$(echo "$DASHBOARD" | sed 's/^/    /')
EOF

    echo "✓ Exported: $TITLE → $FILENAME"
    ((EXPORTED++)) || true
done

echo ""
echo "Summary:"
echo "  Exported: $EXPORTED custom dashboards"
echo "  Skipped: $SKIPPED provisioned dashboards"
echo ""
echo "Next steps:"
echo "  1. Review: git diff $DASHBOARD_DIR/"
echo "  2. Commit: git add $DASHBOARD_DIR/ && git commit -m 'Backup custom Grafana dashboards'"
