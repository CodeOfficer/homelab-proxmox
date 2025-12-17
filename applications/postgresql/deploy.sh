#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="databases"

echo "Deploying PostgreSQL..."

# Create namespace
kubectl apply -f "${SCRIPT_DIR}/namespace.yaml"

# Process values template with envsubst
if [ -z "${POSTGRESQL_PASSWORD:-}" ]; then
    echo "ERROR: POSTGRESQL_PASSWORD environment variable not set"
    echo "Please set it in .envrc: export POSTGRESQL_PASSWORD='your-password'"
    exit 1
fi

envsubst < "${SCRIPT_DIR}/values.yaml" > /tmp/postgresql-values.yaml

# Install/upgrade (creates StatefulSet + PVC)
echo "Installing PostgreSQL..."
helm upgrade --install postgresql oci://registry-1.docker.io/bitnamicharts/postgresql \
    -n "$NAMESPACE" \
    -f /tmp/postgresql-values.yaml \
    --wait \
    --timeout 20m

# Deploy backup CronJob
echo "Deploying backup CronJob..."
kubectl apply -f "${SCRIPT_DIR}/backup-cronjob.yaml"

echo ""
echo "PostgreSQL deployed!"
echo "Connection: postgresql.databases.svc.cluster.local:5432"
