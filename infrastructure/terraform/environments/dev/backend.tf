# -----------------------------------------------------------------------------
# Dev Environment - Remote State Backend
# -----------------------------------------------------------------------------
# Run: tofu init -backend-config='bucket=cloudmart-tfstate-YOUR_PROJECT_ID'
# to configure the GCS backend bucket.
# -----------------------------------------------------------------------------

terraform {
  backend "gcs" {
    bucket = "cloudmart-tfstate-PROJECT_ID" # Replace or use: tofu init -backend-config='bucket=cloudmart-tfstate-YOUR_PROJECT_ID'
    prefix = "env/dev"
  }
}
