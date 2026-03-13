# -----------------------------------------------------------------------------
# Dev Environment - Remote State Backend
# -----------------------------------------------------------------------------
# Run: tofu init -backend-config='bucket=cloudmart-tfstate-YOUR_PROJECT_ID'
# to configure the GCS backend bucket.
# -----------------------------------------------------------------------------

terraform {
  backend "gcs" {
    bucket = "cloudmart-tfstate-project-0042e987-ac93-43ec-a4f"
    prefix = "env/dev"
  }
}
