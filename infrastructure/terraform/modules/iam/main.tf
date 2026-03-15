# -----------------------------------------------------------------------------
# IAM Module - Main
# -----------------------------------------------------------------------------
# Defines Google Service Accounts and IAM bindings for:
#   1. GKE node pool (logging, monitoring, artifact registry)
#   2. Product Service workload (Cloud SQL, Pub/Sub subscriber)
#   3. Order Service workload (Cloud SQL, Pub/Sub publisher)
#   4. Bastion host (kubectl access)
#
# Workload Identity bindings are forward-looking -- they work even if the
# Kubernetes Service Account (KSA) doesn't exist yet. The KSA must be
# created in Phase 5 with the annotation:
#   iam.gke.io/gcp-service-account = <GSA_EMAIL>
#
# Pattern reference: RESEARCH.md Pattern 3 (Workload Identity Binding)
# Anti-pattern: Never create JSON key files -- use Workload Identity exclusively
# -----------------------------------------------------------------------------

# ===========================================================================
# 1. GKE Node Service Account
# ===========================================================================
# Used by GKE node pool VMs. Minimal permissions: logging, monitoring,
# and pulling images from Artifact Registry.

resource "google_service_account" "gke_nodes" {
  account_id   = "${var.project_name}-gke-nodes"
  display_name = "GKE Node Service Account"
  description  = "Service account for GKE node pool VMs in ${var.environment}"
}

# Logging -- write logs to Cloud Logging
resource "google_project_iam_member" "gke_nodes_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Monitoring -- write metrics to Cloud Monitoring
resource "google_project_iam_member" "gke_nodes_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Monitoring -- read monitoring dashboards and configs
resource "google_project_iam_member" "gke_nodes_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# Artifact Registry -- pull container images
resource "google_project_iam_member" "gke_nodes_ar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# ===========================================================================
# 2. Product Service - Workload Identity SA
# ===========================================================================
# Used by the Product Service pods via Workload Identity.
# Needs: Cloud SQL client (database access), Pub/Sub subscriber (receive order events)

resource "google_service_account" "product_service" {
  account_id   = "${var.project_name}-product-svc"
  display_name = "Product Service Workload Identity SA"
  description  = "Service account for Product Service pods via Workload Identity"
}

# Workload Identity binding: allow KSA to impersonate this GSA
# The KSA "product-service" in the environment namespace must be annotated with:
#   iam.gke.io/gcp-service-account = <this SA email>
resource "google_service_account_iam_binding" "product_workload_identity" {
  service_account_id = google_service_account.product_service.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[${var.environment}/product-service]"
  ]
}

# Cloud SQL -- connect to PostgreSQL databases
resource "google_project_iam_member" "product_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.product_service.email}"
}

# Pub/Sub -- subscribe to order-placed events for inventory updates
resource "google_project_iam_member" "product_pubsub_subscriber" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.product_service.email}"
}

# ===========================================================================
# 3. Order Service - Workload Identity SA
# ===========================================================================
# Used by the Order Service pods via Workload Identity.
# Needs: Cloud SQL client (database access), Pub/Sub publisher (publish order events)

resource "google_service_account" "order_service" {
  account_id   = "${var.project_name}-order-svc"
  display_name = "Order Service Workload Identity SA"
  description  = "Service account for Order Service pods via Workload Identity"
}

# Workload Identity binding: allow KSA to impersonate this GSA
# The KSA "order-service" in the environment namespace must be annotated with:
#   iam.gke.io/gcp-service-account = <this SA email>
resource "google_service_account_iam_binding" "order_workload_identity" {
  service_account_id = google_service_account.order_service.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[${var.environment}/order-service]"
  ]
}

# Cloud SQL -- connect to PostgreSQL databases
resource "google_project_iam_member" "order_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.order_service.email}"
}

# Pub/Sub -- publish order-placed events
resource "google_project_iam_member" "order_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.order_service.email}"
}

# ===========================================================================
# 4. Bastion Service Account
# ===========================================================================
# Used by the bastion host VM for kubectl access to the GKE cluster.

resource "google_service_account" "bastion" {
  account_id   = "${var.project_name}-bastion"
  display_name = "Bastion Host Service Account"
  description  = "Service account for bastion host VM with kubectl access"
}

# Container Admin -- full GKE access for helm installs (RBAC, webhooks, CRDs)
resource "google_project_iam_member" "bastion_container_admin" {
  project = var.project_id
  role    = "roles/container.admin"
  member  = "serviceAccount:${google_service_account.bastion.email}"
}
