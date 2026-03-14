#!/usr/bin/env bash
# =============================================================================
# CloudMart Database Seed Script
# =============================================================================
#
# Seeds the product database with categories, products, and inventory data.
# Run from the bastion host after the platform is deployed and pods are running.
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
echo "[1/3] Reading database credentials from Kubernetes secret..."

DB_PASSWORD=$(kubectl get secret db-credentials -n "${NAMESPACE}" \
  -o jsonpath='{.data.password}' | base64 -d)

# Get Cloud SQL IP from product-service ConfigMap
DB_HOST=$(kubectl get configmap product-service-config -n "${NAMESPACE}" \
  -o jsonpath='{.data.SPRING_DATASOURCE_URL}' 2>/dev/null \
  | sed -n 's|jdbc:postgresql://\([^:]*\):.*|\1|p')

if [ -z "${DB_HOST}" ]; then
  echo "WARNING: Could not extract DB host from ConfigMap. Trying direct IP..."
  DB_HOST=$(kubectl get configmap product-service-config -n "${NAMESPACE}" \
    -o yaml 2>/dev/null | grep -oP '(?<=postgresql://)\d+\.\d+\.\d+\.\d+' | head -1)
fi

if [ -z "${DB_HOST}" ]; then
  echo "ERROR: Could not determine Cloud SQL IP. Set DB_HOST manually:"
  echo "  DB_HOST=10.x.x.x $0 ${NAMESPACE}"
  exit 1
fi

echo "  DB Host: ${DB_HOST}"
echo "  DB Name: productdb"
echo "  DB User: cloudmart"
echo ""

# ---------------------------------------------------------------------------
# Seed via temporary postgres pod
# ---------------------------------------------------------------------------
echo "[2/3] Seeding database via temporary postgres pod..."

# Delete leftover pod from previous failed run
kubectl delete pod seed-db -n "${NAMESPACE}" --ignore-not-found=true 2>/dev/null

kubectl run seed-db \
  --namespace="${NAMESPACE}" \
  --rm -i \
  --restart=Never \
  --labels="app=product-service" \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h "${DB_HOST}" -U cloudmart -d productdb -v ON_ERROR_STOP=1 < "${DATA_SQL}"

echo ""

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------
echo "[3/3] Verifying seed data..."

PRODUCT_COUNT=$(kubectl run verify-seed \
  --namespace="${NAMESPACE}" \
  --rm -i \
  --restart=Never \
  --labels="app=product-service" \
  --image=postgres:16-alpine \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h "${DB_HOST}" -U cloudmart -d productdb -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null \
  | tr -d '[:space:]')

echo "  Products in database: ${PRODUCT_COUNT}"
echo ""

if [ "${PRODUCT_COUNT}" -gt 0 ] 2>/dev/null; then
  echo "Seed complete. ${PRODUCT_COUNT} products loaded."
else
  echo "WARNING: Could not verify product count. Check manually:"
  echo "  kubectl run psql-check --rm -it --restart=Never --image=postgres:16-alpine \\"
  echo "    --env=\"PGPASSWORD=\${DB_PASSWORD}\" -- psql -h ${DB_HOST} -U cloudmart -d productdb"
fi
