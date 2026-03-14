#!/usr/bin/env bash
# =============================================================================
# CloudMart Database Seed Script
# =============================================================================
#
# Seeds the product database with categories, products, and inventory data.
# Uses a ConfigMap + Job pattern for reliability (no stdin piping needed).
#
# Usage:
#   ./seed-data.sh [namespace]
#
# Arguments:
#   namespace  - Kubernetes namespace (default: dev)
#
# Prerequisites:
#   - kubectl configured with GKE cluster access
#   - db-credentials secret exists in the target namespace
#   - Product service has created the schema (ddl-auto: update)
#
# =============================================================================

set -euo pipefail

NAMESPACE="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DATA_SQL="${REPO_ROOT}/services/product-service/src/main/resources/data.sql"

echo "============================================================"
echo " CloudMart Database Seed"
echo "============================================================"
echo ""
echo "Namespace : ${NAMESPACE}"
echo "Data file : ${DATA_SQL}"
echo ""

# ---------------------------------------------------------------------------
# Validate prerequisites
# ---------------------------------------------------------------------------
if [ ! -f "${DATA_SQL}" ]; then
  echo "ERROR: data.sql not found at ${DATA_SQL}"
  exit 1
fi

if ! kubectl get secret db-credentials -n "${NAMESPACE}" &>/dev/null; then
  echo "ERROR: db-credentials secret not found in namespace '${NAMESPACE}'"
  exit 1
fi

# ---------------------------------------------------------------------------
# Extract connection details
# ---------------------------------------------------------------------------
echo "[1/4] Reading database credentials..."

DB_PASSWORD=$(kubectl get secret db-credentials -n "${NAMESPACE}" \
  -o jsonpath='{.data.password}' | base64 -d)

DB_HOST=$(kubectl get configmap product-service-config -n "${NAMESPACE}" \
  -o jsonpath='{.data.SPRING_DATASOURCE_URL}' 2>/dev/null \
  | sed -n 's|jdbc:postgresql://\([^:]*\):.*|\1|p')

if [ -z "${DB_HOST}" ]; then
  DB_HOST=$(kubectl get configmap product-service-config -n "${NAMESPACE}" \
    -o yaml 2>/dev/null | grep -oP '(?<=postgresql://)\d+\.\d+\.\d+\.\d+' | head -1)
fi

if [ -z "${DB_HOST}" ]; then
  echo "ERROR: Could not determine Cloud SQL IP."
  exit 1
fi

echo "  DB Host: ${DB_HOST}"
echo ""

# ---------------------------------------------------------------------------
# Create ConfigMap from data.sql
# ---------------------------------------------------------------------------
echo "[2/4] Creating seed-data ConfigMap..."

kubectl create configmap seed-data \
  --namespace="${NAMESPACE}" \
  --from-file=data.sql="${DATA_SQL}" \
  --dry-run=client -o yaml | kubectl apply -f -

# ---------------------------------------------------------------------------
# Clean up previous runs
# ---------------------------------------------------------------------------
echo "[3/4] Running seed Job..."

kubectl delete job seed-db -n "${NAMESPACE}" --ignore-not-found=true 2>/dev/null

# ---------------------------------------------------------------------------
# Create and run the seed Job
# ---------------------------------------------------------------------------
cat <<JOBEOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: seed-db
  namespace: ${NAMESPACE}
  labels:
    app: product-service
spec:
  backoffLimit: 1
  ttlSecondsAfterFinished: 300
  template:
    metadata:
      labels:
        app: product-service
    spec:
      restartPolicy: Never
      containers:
      - name: psql
        image: postgres:16-alpine
        env:
        - name: PGPASSWORD
          value: "${DB_PASSWORD}"
        command:
        - psql
        - -h
        - "${DB_HOST}"
        - -U
        - cloudmart
        - -d
        - productdb
        - -v
        - ON_ERROR_STOP=1
        - -f
        - /seed/data.sql
        volumeMounts:
        - name: seed-sql
          mountPath: /seed
          readOnly: true
      volumes:
      - name: seed-sql
        configMap:
          name: seed-data
JOBEOF

echo "  Waiting for Job to complete..."
kubectl wait --for=condition=complete job/seed-db \
  -n "${NAMESPACE}" --timeout=120s 2>/dev/null \
  || { echo "  Job did not complete. Checking logs:"; \
       kubectl logs job/seed-db -n "${NAMESPACE}" 2>/dev/null; exit 1; }

echo "  Job completed successfully."
echo ""

# ---------------------------------------------------------------------------
# Show Job logs (seed output)
# ---------------------------------------------------------------------------
echo "[4/4] Seed results:"
kubectl logs job/seed-db -n "${NAMESPACE}" 2>/dev/null
echo ""

# ---------------------------------------------------------------------------
# Clean up
# ---------------------------------------------------------------------------
kubectl delete configmap seed-data -n "${NAMESPACE}" --ignore-not-found=true 2>/dev/null
echo "Seed complete."
