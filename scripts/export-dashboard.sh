#!/usr/bin/env bash
set -euo pipefail

# Export a single Grafana dashboard by UID
# Usage: ./export-dashboard.sh <uid> <filename>

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <dashboard-uid> <output-filename>"
    exit 1
fi

DASHBOARD_UID="$1"
FILENAME="$2"
KUBECONFIG="${KUBECONFIG:-infrastructure/terraform/kubeconfig}"
PASSWORD_FILE=".secrets/grafana-admin-password"
DASHBOARD_DIR="applications/monitoring/dashboards"

if [[ ! -f "$PASSWORD_FILE" ]]; then
    echo "ERROR: $PASSWORD_FILE not found"
    exit 1
fi

PASSWORD=$(cat "$PASSWORD_FILE")

echo "Fetching dashboard: $DASHBOARD_UID"

# Fetch dashboard JSON
DASHBOARD_JSON=$(kubectl exec -n monitoring deployment/monitoring-grafana -c grafana -- \
    wget -qO- --header "Authorization: Basic $(echo -n "admin:${PASSWORD}" | base64)" \
    "http://localhost:3000/api/dashboards/uid/${DASHBOARD_UID}")

# Extract just the dashboard object (not the metadata wrapper)
DASHBOARD=$(echo "$DASHBOARD_JSON" | jq '.dashboard')

# Get title from dashboard
TITLE=$(echo "$DASHBOARD" | jq -r '.title')

# Wrap in ConfigMap
mkdir -p "$DASHBOARD_DIR"
cat > "${DASHBOARD_DIR}/${FILENAME}" <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${FILENAME%.yaml}-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  ${FILENAME%.yaml}.json: |
$(echo "$DASHBOARD" | sed 's/^/    /')
EOF

echo "✓ Exported: ${TITLE}"
echo "  → ${DASHBOARD_DIR}/${FILENAME}"
