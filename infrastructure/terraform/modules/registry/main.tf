# -----------------------------------------------------------------------------
# Artifact Registry Module
# Creates a Docker repository in Artifact Registry for container images.
# -----------------------------------------------------------------------------

resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "${var.project_name}-docker"
  description   = "Docker container images for CloudMart"
  format        = "DOCKER"

  docker_config {
    immutable_tags = false
  }
}
