# -----------------------------------------------------------------------------
# WIF Module - Workload Identity Federation for GitHub Actions
# -----------------------------------------------------------------------------
# Enables keyless authentication from GitHub Actions to GCP via OIDC.
# Creates an identity pool, OIDC provider, CI service account, and
# the IAM bindings required for CI/CD workflows.
#
# Resource dependency graph:
#   pool ──> provider (pool reference)
#   ci SA ──> WIF binding (SA + pool reference)
#   ci SA ──> IAM bindings (project-level roles)
# -----------------------------------------------------------------------------

# --- Workload Identity Pool ---
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions"
  display_name              = "GitHub Actions"
  description               = "Identity pool for GitHub Actions OIDC authentication"
}

# --- OIDC Provider (GitHub Actions token issuer) ---
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub"
  description                        = "GitHub Actions OIDC provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "assertion.repository == \"${var.github_org}/${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# --- CI/CD Service Account ---
resource "google_service_account" "ci" {
  account_id   = "${var.project_name}-ci"
  display_name = "CI/CD Service Account"
  description  = "Service account for GitHub Actions CI/CD workflows"
}

# --- WIF Binding (allow GitHub Actions to impersonate CI SA) ---
resource "google_service_account_iam_member" "ci_wif" {
  service_account_id = google_service_account.ci.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_org}/${var.github_repo}"
}

# --- Project-level IAM bindings for CI SA ---

# Push/pull Docker images to Artifact Registry
resource "google_project_iam_member" "ci_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.ci.email}"
}

# Read/write Terraform state in GCS
resource "google_project_iam_member" "ci_gcs_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.ci.email}"
}

# Allow API calls (e.g., tofu plan/apply)
resource "google_project_iam_member" "ci_service_usage" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.ci.email}"
}
