#!/usr/bin/env bash
set -euo pipefail

# Backup all custom Grafana dashboards to git
# Run before teardown to preserve dashboards stored in Grafana DB

KUBECONFIG="${KUBECONFIG:-infrastructure/terraform/kubeconfig}"
DASHBOARD_DIR="applications/monitoring/dashboards"
PASSWORD_FILE=".secrets/grafana-admin-password"

if [[ ! -f "$PASSWORD_FILE" ]]; then
    echo "ERROR: $PASSWORD_FILE not found"
    exit 1
fi

PASSWORD=$(cat "$PASSWORD_FILE")

echo "Fetching all dashboards from Grafana..."

# Get list of all dashboard UIDs (exclude provisioned ones from grafana.com)
DASHBOARDS=$(kubectl exec -n monitoring deployment/monitoring-grafana -c grafana -- \
    wget -qO- --header "Authorization: Basic $(echo -n "admin:${PASSWORD}" | base64)" \
    'http://localhost:3000/api/search?type=dash-db' | \
    grep -o '"uid":"[^"]*"' | cut -d'"' -f4 || true)

if [[ -z "$DASHBOARDS" ]]; then
    echo "No dashboards found or API call failed"
    exit 1
fi

mkdir -p "$DASHBOARD_DIR"

# Export each dashboard
for uid in $DASHBOARDS; do
    echo "Exporting dashboard: $uid"

    # Fetch dashboard JSON
    DASHBOARD_JSON=$(kubectl exec -n monitoring deployment/monitoring-grafana -c grafana -- \
        wget -qO- --header "Authorization: Basic $(echo -n "admin:${PASSWORD}" | base64)" \
        "http://localhost:3000/api/dashboards/uid/${uid}")

    # Extract title for filename
    TITLE=$(echo "$DASHBOARD_JSON" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4 | \
        tr '[:upper:]' '[:lower:]' | tr ' /' '-')

    # Wrap in ConfigMap
    cat > "${DASHBOARD_DIR}/${TITLE}.yaml" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${TITLE}-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  ${TITLE}.json: |
$(echo "$DASHBOARD_JSON" | jq '.dashboard' | sed 's/^/    /')
EOF

    echo "  → ${DASHBOARD_DIR}/${TITLE}.yaml"
done

echo ""
echo "✓ All dashboards exported"
echo "Review changes: git diff applications/monitoring/dashboards/"
