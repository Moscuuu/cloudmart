#!/usr/bin/env bash
# =============================================================================
# CloudMart Monitoring Stack Install Script
# =============================================================================
#
# Installs the complete observability stack in the monitoring namespace:
#   1. kube-prometheus-stack (Prometheus, Grafana, Alertmanager)
#   2. Loki (log aggregation)
#   3. Tempo (distributed tracing)
#   4. Alloy Logs (DaemonSet log collector)
#   5. Alloy Traces (Deployment OTLP receiver)
#
# Usage:
#   ./install.sh
#
# Prerequisites:
#   - kubectl configured with cluster access
#   - helm v3 installed
#
# Slack Alerting (optional):
#   Before running this script, apply the Slack webhook secret so Alertmanager
#   can route notifications to your channel:
#     1. Edit alerts/slack-webhook-secret.yaml with your webhook URL
#     2. kubectl apply -f alerts/slack-webhook-secret.yaml
#
# =============================================================================

set -euo pipefail

# cd to script directory for relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== CloudMart Monitoring Stack Installation ==="
echo ""

# 1. Create namespace
echo "[1/7] Creating monitoring namespace..."
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# 2. Add Helm repos
echo "[2/7] Adding Helm repositories..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

# 3. Update repos
echo "[3/7] Updating Helm repositories..."
helm repo update

# 4. Install kube-prometheus-stack
echo "[4/7] Installing kube-prometheus-stack (Prometheus + Grafana + Alertmanager)..."
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f kube-prometheus-stack/values.yaml \
  --wait \
  --timeout 10m

# 5. Install Loki
echo "[5/7] Installing Loki (log aggregation)..."
helm upgrade --install loki grafana/loki \
  -n monitoring \
  -f loki/values.yaml \
  --wait \
  --timeout 5m

# 6. Install Tempo
echo "[6/7] Installing Tempo (distributed tracing)..."
helm upgrade --install tempo grafana/tempo \
  -n monitoring \
  -f tempo/values.yaml \
  --wait \
  --timeout 5m

# 7a. Install Alloy Logs (DaemonSet)
echo "[7/7] Installing Alloy collectors..."
helm upgrade --install alloy-logs grafana/alloy \
  -n monitoring \
  -f alloy-logs/values.yaml \
  --wait \
  --timeout 5m

# 7b. Install Alloy Traces (Deployment)
helm upgrade --install alloy-traces grafana/alloy \
  -n monitoring \
  -f alloy-traces/values.yaml \
  --wait \
  --timeout 5m

# 8. Apply PrometheusRule alert definitions
echo "[8/9] Applying PrometheusRule alert definitions..."
kubectl apply -f alerts/prometheus-rules.yaml

# 9. Apply dashboard ConfigMaps and ServiceMonitors
echo "[9/9] Applying dashboards and ServiceMonitors..."
kubectl apply -f dashboards/dashboards-configmap.yaml 2>/dev/null || echo "  (dashboards-configmap.yaml not found -- skipping)"
kubectl apply -f servicemonitors.yaml 2>/dev/null || echo "  (servicemonitors.yaml not found -- skipping)"

# Check for Slack webhook secret
echo ""
kubectl get secret slack-webhook -n monitoring >/dev/null 2>&1 \
  || echo "WARNING: slack-webhook secret not found. Apply alerts/slack-webhook-secret.yaml with your webhook URL."

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Verify with:"
echo "  kubectl get pods -n monitoring"
echo ""
echo "Access Grafana:"
echo "  kubectl get svc -n monitoring kube-prometheus-stack-grafana"
echo "  Default credentials: admin / prom-operator"
