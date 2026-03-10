# -----------------------------------------------------------------------------
# WIF Module - Outputs
# -----------------------------------------------------------------------------
# Values consumed by GitHub Actions workflow configuration.
# -----------------------------------------------------------------------------

output "workload_identity_provider" {
  description = "Full WIF provider resource name for GitHub Actions auth"
  value       = "projects/${var.project_number}/locations/global/workloadIdentityPools/github-actions/providers/github"
}

output "ci_service_account_email" {
  description = "CI/CD service account email for GitHub Actions impersonation"
  value       = google_service_account.ci.email
}
