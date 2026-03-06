# -----------------------------------------------------------------------------
# Dev Environment - Remote State Backend
# -----------------------------------------------------------------------------
# Run: tofu init -backend-config='bucket=cloudmart-tfstate-YOUR_PROJECT_ID'
# to configure the GCS backend bucket.
# -----------------------------------------------------------------------------

terraform {
  backend "gcs" {
    bucket = "cloudmart-tfstate-PROJECT_ID" # Replace PROJECT_ID or use -backend-config
    prefix = "env/dev"
  }
}
