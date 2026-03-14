#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Create Kubernetes Secrets and update ConfigMap patches for staging environment.
# Reads sensitive values from Terraform outputs and creates k8s secrets,
# then updates ConfigMap patch files with the correct Cloud SQL IP.
#
# Prerequisites:
#   - kubectl configured for the target GKE cluster
#   - tofu/terraform state accessible (run from infra/environments/staging)
#   - Target namespace "staging" must exist
#
# Usage:
#   cd infrastructure/terraform/environments/staging
#   bash ../../../../k8s/overlays/staging/create-secrets.sh
#
# Or pass values directly:
#   DB_PASSWORD=xxx CLOUD_SQL_IP=10.x.x.x bash create-secrets.sh
# -----------------------------------------------------------------------------
set -euo pipefail

NAMESPACE="staging"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PATCHES_DIR="${SCRIPT_DIR}/patches"

# Read from terraform output if not provided via env
if [ -z "${DB_PASSWORD:-}" ]; then
  echo "Reading db_password from terraform output..."
  DB_PASSWORD=$(tofu output -raw db_password 2>/dev/null || terraform output -raw db_password)
fi

if [ -z "${CLOUD_SQL_IP:-}" ]; then
  echo "Reading database_private_ip from terraform output..."
  CLOUD_SQL_IP=$(tofu output -raw database_private_ip 2>/dev/null || terraform output -raw database_private_ip)
fi

# Generate a random JWT secret if not provided
if [ -z "${JWT_SECRET:-}" ]; then
  echo "Generating random JWT secret (32 bytes)..."
  JWT_SECRET=$(openssl rand -base64 32)
fi

# OAuth credentials (optional for staging -- use empty string if not set)
OAUTH_CLIENT_ID="${OAUTH_CLIENT_ID:-}"
OAUTH_CLIENT_SECRET="${OAUTH_CLIENT_SECRET:-}"

# URL-encode the password for connection strings (handles special chars)
DB_PASSWORD_ENCODED=$(printf '%s' "$DB_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))")

echo "--- Creating namespace ${NAMESPACE} (if not exists) ---"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

echo "--- Creating db-credentials secret ---"
kubectl create secret generic db-credentials \
  --namespace="${NAMESPACE}" \
  --from-literal=password="${DB_PASSWORD}" \
  --from-literal=database-url="postgresql+asyncpg://cloudmart:${DB_PASSWORD_ENCODED}@${CLOUD_SQL_IP}:5432/orderdb" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "--- Creating auth-secrets secret ---"
kubectl create secret generic auth-secrets \
  --namespace="${NAMESPACE}" \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=oauth-client-id="${OAUTH_CLIENT_ID}" \
  --from-literal=oauth-client-secret="${OAUTH_CLIENT_SECRET}" \
  --dry-run=client -o yaml | kubectl apply -f -

# --- Update ConfigMap patches with actual Cloud SQL IP ---
echo "--- Updating ConfigMap patches with Cloud SQL IP: ${CLOUD_SQL_IP} ---"

# Product service: JDBC URL
sed -i.bak "s|jdbc:postgresql://[^:]*:5432/productdb|jdbc:postgresql://${CLOUD_SQL_IP}:5432/productdb|" \
  "${PATCHES_DIR}/product-service-config.yaml"
rm -f "${PATCHES_DIR}/product-service-config.yaml.bak"

echo "--- Done ---"
echo ""
echo "Secrets created in namespace '${NAMESPACE}':"
echo "  - db-credentials (password + database-url for order-service)"
echo "  - auth-secrets (jwt-secret, oauth-client-id, oauth-client-secret)"
echo ""
echo "ConfigMap patches updated:"
echo "  - product-service-config.yaml (SPRING_DATASOURCE_URL → ${CLOUD_SQL_IP})"
echo ""
echo "Next steps:"
echo "  1. Apply kustomize overlay: kubectl apply -k k8s/overlays/staging/"
echo "  2. Verify pods: kubectl get pods -n ${NAMESPACE}"
