#!/usr/bin/env bash
#
# CloudMart GCP Project Bootstrap Script
#
# This script performs one-time GCP project setup:
#   1. Enables all required GCP APIs
#   2. Creates a GCS bucket for Terraform/OpenTofu remote state
#   3. Enables bucket versioning for state history
#
# Usage:
#   ./bootstrap.sh <PROJECT_ID>
#   ./bootstrap.sh                  # Prompts for project ID
#
# This script is idempotent -- safe to re-run. API enablement and bucket
# creation are no-ops if already done.
#
# Compatible with both OpenTofu and Terraform (they share the same GCS backend).

set -euo pipefail

# ---------------------------------------------------------------------------
# 1. Read project ID from argument or prompt
# ---------------------------------------------------------------------------
PROJECT_ID="${1:-}"

if [[ -z "$PROJECT_ID" ]]; then
  read -rp "Enter your GCP project ID: " PROJECT_ID
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: Project ID is required."
  echo "Usage: $0 <PROJECT_ID>"
  exit 1
fi

echo "==> Bootstrapping GCP project: $PROJECT_ID"
echo ""

# ---------------------------------------------------------------------------
# 2. Enable all required GCP APIs
# ---------------------------------------------------------------------------
echo "==> Enabling required GCP APIs..."

APIS=(
  # Compute Engine -- VPC, subnets, firewall rules, Cloud NAT, bastion VM
  "compute.googleapis.com"

  # Google Kubernetes Engine -- GKE cluster and node pools
  "container.googleapis.com"

  # Cloud SQL Admin -- Cloud SQL PostgreSQL instances and databases
  "sqladmin.googleapis.com"

  # Service Networking -- VPC peering for Cloud SQL private IP connectivity
  "servicenetworking.googleapis.com"

  # Pub/Sub -- asynchronous messaging between microservices
  "pubsub.googleapis.com"

  # Artifact Registry -- Docker container image repository
  "artifactregistry.googleapis.com"

  # IAM -- service accounts and role bindings
  "iam.googleapis.com"

  # Cloud Resource Manager -- project-level IAM policy management
  "cloudresourcemanager.googleapis.com"

  # IAM Credentials -- Workload Identity token exchange for pod-level GCP auth
  "iamcredentials.googleapis.com"
)

for api in "${APIS[@]}"; do
  echo "    Enabling $api..."
  gcloud services enable "$api" --project="$PROJECT_ID"
done

echo "    All ${#APIS[@]} APIs enabled."
echo ""

# ---------------------------------------------------------------------------
# 3. Create GCS bucket for Terraform/OpenTofu remote state
# ---------------------------------------------------------------------------
BUCKET_NAME="cloudmart-tfstate-${PROJECT_ID}"
BUCKET_URL="gs://${BUCKET_NAME}"
REGION="us-central1"

echo "==> Creating GCS state bucket: $BUCKET_URL"

if gsutil ls -b "$BUCKET_URL" &>/dev/null; then
  echo "    Bucket already exists -- skipping creation."
else
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "$BUCKET_URL"
  echo "    Bucket created."
fi

# ---------------------------------------------------------------------------
# 4. Enable bucket versioning for state history
# ---------------------------------------------------------------------------
echo "==> Enabling bucket versioning..."
gsutil versioning set on "$BUCKET_URL"
echo "    Versioning enabled."
echo ""

# ---------------------------------------------------------------------------
# 5. Success -- print next steps
# ---------------------------------------------------------------------------
echo "============================================"
echo "  Bootstrap complete!"
echo "============================================"
echo ""
echo "Project:      $PROJECT_ID"
echo "State bucket: $BUCKET_URL"
echo "Region:       $REGION"
echo ""
echo "Next steps:"
echo "  1. cd infrastructure/terraform/environments/dev"
echo "  2. Update terraform.tfvars with your project ID and IP"
echo "  3. Run: tofu init    (or: terraform init)"
echo "  4. Run: tofu plan    (or: terraform plan)"
echo "  5. Run: tofu apply   (or: terraform apply)"
echo ""
echo "Note: This script is compatible with both OpenTofu and Terraform."
echo "      We recommend OpenTofu for its open-source MPL-2.0 license."
