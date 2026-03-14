#!/usr/bin/env bash
# =============================================================================
# CloudMart Platform Deployment Script
# =============================================================================
#
# Deploys the entire platform stack on the bastion host in correct order:
#   1. Cert-Manager (TLS certificate management)
#   2. Gateway API resources (Gateway, HTTPRoutes, ClusterIssuer)
#   3. Secrets (database credentials, auth secrets)
#   4. ArgoCD (GitOps continuous delivery)
#   5. Monitoring (Prometheus, Grafana, Loki, Tempo, Alloy)
#
# Usage:
#   ./deploy-platform.sh
#
# Prerequisites:
#   - kubectl configured with GKE cluster access
#   - helm v3 installed
#   - Run from anywhere -- script auto-detects repo root
#
# Optional environment variables:
#   DB_PASSWORD    - Database password (from Terraform output)
#   CLOUD_SQL_IP   - Cloud SQL private IP (from Terraform output)
#   JWT_SECRET     - JWT signing secret (auto-generated if not set)
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve repo root (works whether invoked from repo root or script directory)
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}"

echo "============================================================"
echo " CloudMart Platform Deployment"
echo "============================================================"
echo ""
echo "Repo root : ${REPO_ROOT}"
echo "Timestamp : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
echo "[pre-flight] Verifying prerequisites..."

if ! command -v kubectl &>/dev/null; then
  echo "ERROR: kubectl not found. Install kubectl first."
  exit 1
fi

if ! command -v helm &>/dev/null; then
  echo "ERROR: helm not found. Install helm first."
  exit 1
fi

echo "[pre-flight] Checking cluster connectivity..."
if ! kubectl cluster-info &>/dev/null; then
  echo "ERROR: Cannot connect to Kubernetes cluster."
  echo "  Ensure KUBECONFIG is set or run: gcloud container clusters get-credentials <cluster>"
  exit 1
fi

echo "[pre-flight] Cluster info:"
kubectl cluster-info 2>&1 | head -2
echo ""

# ---------------------------------------------------------------------------
# Step 1 -- Cert-Manager
# ---------------------------------------------------------------------------
echo "============================================================"
echo " [1/5] Cert-Manager"
echo "============================================================"

echo "  Adding jetstack Helm repo..."
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update jetstack

echo "  Installing cert-manager..."
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait \
  --timeout 5m

echo "  Waiting for cert-manager webhook..."
kubectl rollout status deployment/cert-manager-webhook \
  -n cert-manager --timeout=120s

echo "  Cert-Manager ready."
echo ""

# ---------------------------------------------------------------------------
# Step 2 -- Gateway namespace + resources
# ---------------------------------------------------------------------------
echo "============================================================"
echo " [2/5] Gateway API Resources"
echo "============================================================"

echo "  Ensuring application namespaces exist..."
for NS in dev staging prod; do
  kubectl create namespace "${NS}" 2>/dev/null || true
done

echo "  Applying gateway kustomization..."
kubectl apply -k k8s/platform/gateway/

echo "  Gateway resources applied (namespace, Gateway, ClusterIssuer, Certificate, HTTPRoutes)."
echo ""

# ---------------------------------------------------------------------------
# Step 3 -- Secrets
# ---------------------------------------------------------------------------
echo "============================================================"
echo " [3/5] Secrets"
echo "============================================================"

SECRETS_EXIST=false
if kubectl get secret db-credentials -n dev &>/dev/null; then
  echo "  db-credentials secret already exists in dev namespace."
  SECRETS_EXIST=true
fi

if kubectl get secret auth-secrets -n dev &>/dev/null; then
  echo "  auth-secrets secret already exists in dev namespace."
fi

if [ "${SECRETS_EXIST}" = "false" ]; then
  if [ -n "${DB_PASSWORD:-}" ] && [ -n "${CLOUD_SQL_IP:-}" ]; then
    echo "  Creating secrets from environment variables..."
    bash k8s/overlays/dev/create-secrets.sh
  else
    echo "  WARNING: Secrets not found and DB_PASSWORD/CLOUD_SQL_IP not set."
    echo ""
    echo "  To create secrets, either:"
    echo "    1. Run create-secrets.sh from your Terraform directory:"
    echo "       cd infrastructure/terraform/environments/dev"
    echo "       bash ../../../../k8s/overlays/dev/create-secrets.sh"
    echo ""
    echo "    2. Or pass values directly:"
    echo "       DB_PASSWORD=xxx CLOUD_SQL_IP=10.x.x.x ./k8s/platform/deploy-platform.sh"
    echo ""
    echo "  Continuing without secrets (other components will still deploy)."
  fi
fi
echo ""

# ---------------------------------------------------------------------------
# Step 4 -- ArgoCD
# ---------------------------------------------------------------------------
echo "============================================================"
echo " [4/5] ArgoCD"
echo "============================================================"

echo "  Adding argo Helm repo..."
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update argo

echo "  Installing ArgoCD..."
helm upgrade --install argocd argo/argo-cd \
  -n argocd \
  --create-namespace \
  -f k8s/platform/argocd/install/values.yaml \
  --wait \
  --timeout 10m

echo "  Bootstrapping app-of-apps..."
kubectl apply -f k8s/platform/argocd/applications.yaml

echo "  ArgoCD ready."
echo ""
echo "  Get initial admin password:"
echo "    kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d && echo"
echo ""

# ---------------------------------------------------------------------------
# Step 5 -- Monitoring
# ---------------------------------------------------------------------------
echo "============================================================"
echo " [5/5] Monitoring"
echo "============================================================"

echo "  Calling monitoring install script..."
bash k8s/platform/monitoring/install.sh

echo ""

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo "============================================================"
echo " Platform Deployment Complete"
echo "============================================================"
echo ""

echo "Namespace Status:"
for NS in gateway cert-manager argocd monitoring dev; do
  POD_COUNT=$(kubectl get pods -n "${NS}" --no-headers 2>/dev/null | wc -l | tr -d ' ')
  READY_COUNT=$(kubectl get pods -n "${NS}" --no-headers 2>/dev/null | grep -c "Running" || true)
  echo "  ${NS}: ${READY_COUNT}/${POD_COUNT} pods running"
done
echo ""

echo "External Access:"
GATEWAY_IP=$(kubectl get gateway cloudmart-gateway -n gateway -o jsonpath='{.status.addresses[0].value}' 2>/dev/null || echo "<pending>")
echo "  Gateway IP : ${GATEWAY_IP}"

ARGOCD_IP=$(kubectl get svc argocd-server -n argocd -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "<pending>")
echo "  ArgoCD UI  : http://${ARGOCD_IP}"

GRAFANA_IP=$(kubectl get svc kube-prometheus-stack-grafana -n monitoring -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "<ClusterIP -- use port-forward>")
echo "  Grafana    : ${GRAFANA_IP}  (admin / prom-operator)"
echo ""

echo "Done. Total time: ${SECONDS}s"
