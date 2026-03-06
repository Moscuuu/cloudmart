#!/usr/bin/env bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Post-apply Validation for CloudMart Infrastructure
# -----------------------------------------------------------------------------
# Usage: bash validate.sh [environment]
# Default environment: dev
#
# Checks all 10 infrastructure components and prints PASS/FAIL per check.
# Exit code 0 if all pass, 1 otherwise.
# -----------------------------------------------------------------------------

ENV="${1:-dev}"
PROJECT_NAME="cloudmart"
REGION="us-central1"

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_CHECKS=10

# Color codes (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  GREEN=''
  RED=''
  YELLOW=''
  NC=''
fi

check_pass() {
  echo -e "  ${GREEN}PASS${NC}: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
  echo -e "  ${RED}FAIL${NC}: $1 -- $2"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

run_check() {
  local name="$1"
  local cmd="$2"
  local expected="$3"

  local result
  if result=$(eval "$cmd" 2>&1); then
    if echo "$result" | grep -qi "$expected"; then
      check_pass "$name"
    else
      check_fail "$name" "Expected '$expected', got '$result'"
    fi
  else
    check_fail "$name" "Command failed: $result"
  fi
}

echo ""
echo -e "${YELLOW}CloudMart Infrastructure Validation${NC}"
echo "Environment: ${ENV}"
echo "Region: ${REGION}"
echo "========================================="
echo ""

# 1. GKE Cluster Health
echo "[1/10] GKE Cluster Health"
run_check "GKE cluster status" \
  "gcloud container clusters describe ${PROJECT_NAME}-cluster-${ENV} --region=${REGION} --format='value(status)'" \
  "RUNNING"

# 2. Node Pool Status
echo "[2/10] GKE Node Pool Status"
run_check "Node pool status" \
  "gcloud container clusters describe ${PROJECT_NAME}-cluster-${ENV} --region=${REGION} --format='value(nodePools[0].status)'" \
  "RUNNING"

# 3. Cloud SQL Instance
echo "[3/10] Cloud SQL Instance"
run_check "Cloud SQL instance state" \
  "gcloud sql instances describe ${PROJECT_NAME}-db-${ENV} --format='value(state)'" \
  "RUNNABLE"

# 4. Cloud SQL Databases
echo "[4/10] Cloud SQL Databases"
run_check "Cloud SQL databases exist" \
  "gcloud sql databases list --instance=${PROJECT_NAME}-db-${ENV} --format='value(name)'" \
  "productdb"

# 5. Artifact Registry
echo "[5/10] Artifact Registry"
run_check "Artifact Registry repository" \
  "gcloud artifacts repositories describe ${PROJECT_NAME}-docker --location=${REGION} --format='value(name)'" \
  "${PROJECT_NAME}-docker"

# 6. Pub/Sub Topic
echo "[6/10] Pub/Sub Topic"
run_check "Pub/Sub order-placed topic" \
  "gcloud pubsub topics describe order-placed --format='value(name)'" \
  "order-placed"

# 7. Pub/Sub Subscription
echo "[7/10] Pub/Sub Subscription"
run_check "Pub/Sub product-service subscription" \
  "gcloud pubsub subscriptions describe order-placed-product-service --format='value(name)'" \
  "order-placed-product-service"

# 8. Bastion Host
echo "[8/10] Bastion Host"
run_check "Bastion host status" \
  "gcloud compute instances describe ${PROJECT_NAME}-bastion-${ENV} --zone=${REGION}-a --format='value(status)'" \
  "RUNNING"

# 9. VPC Network
echo "[9/10] VPC Network"
run_check "VPC network exists" \
  "gcloud compute networks describe ${PROJECT_NAME}-vpc --format='value(name)'" \
  "${PROJECT_NAME}-vpc"

# 10. Cloud NAT
echo "[10/10] Cloud NAT"
run_check "Cloud NAT exists" \
  "gcloud compute routers nats describe ${PROJECT_NAME}-nat --router=${PROJECT_NAME}-router --region=${REGION} --format='value(name)'" \
  "${PROJECT_NAME}-nat"

# Summary
echo ""
echo "========================================="
echo -e "Results: ${GREEN}${PASS_COUNT}${NC}/${TOTAL_CHECKS} checks passed"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo -e "${RED}${FAIL_COUNT} check(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All checks passed!${NC}"
  exit 0
fi
