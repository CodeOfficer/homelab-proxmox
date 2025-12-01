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

# Deploy PostgreSQL via Helm
echo "Installing PostgreSQL..."
helm upgrade --install postgresql oci://registry-1.docker.io/bitnamicharts/postgresql \
    -n "$NAMESPACE" \
    -f /tmp/postgresql-values.yaml \
    --wait \
    --timeout 5m

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod/postgresql-0 -n "$NAMESPACE" --timeout=120s

# Run restore job if backup exists (idempotent - skips if databases exist)
if [[ -f "${SCRIPT_DIR}/restore-job.yaml" ]]; then
    echo "Running restore job..."
    # Delete any previous restore job
    kubectl delete job postgresql-restore -n "$NAMESPACE" --ignore-not-found=true

    # Create secret for restore job if it doesn't exist
    kubectl create secret generic postgresql-restore \
        --namespace "$NAMESPACE" \
        --from-literal=postgres-password="${POSTGRESQL_PASSWORD}" \
        --dry-run=client -o yaml | kubectl apply -f -

    kubectl apply -f "${SCRIPT_DIR}/restore-job.yaml"
    echo "Waiting for restore to complete..."
    kubectl wait --for=condition=complete job/postgresql-restore -n "$NAMESPACE" --timeout=300s || {
        echo "Restore job failed or timed out - checking logs:"
        kubectl logs -n "$NAMESPACE" job/postgresql-restore || true
        # Don't exit on failure - database may just be non-empty
    }
    echo "Restore job completed"
fi

# Deploy backup CronJob
echo "Deploying backup CronJob..."
kubectl apply -f "${SCRIPT_DIR}/backup-cronjob.yaml"

echo ""
echo "PostgreSQL deployed!"
echo "Connection: postgresql.databases.svc.cluster.local:5432"
