# -----------------------------------------------------------------------------
# GKE Cluster Module
# Creates a private GKE Standard cluster with a separate Spot VM node pool
# and Workload Identity enabled.
# -----------------------------------------------------------------------------

resource "google_container_cluster" "primary" {
  name     = "${var.project_name}-cluster-${var.environment}"
  location = var.region

  # We remove the default node pool and manage our own separately.
  # This is the recommended pattern to avoid lifecycle conflicts.
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = var.network_id
  subnetwork = var.subnet_id

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = var.master_cidr
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.authorized_cidr
      display_name = "authorized-network"
    }
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Dataplane V2 (Cilium) -- required for NetworkPolicy enforcement.
  # Do NOT set enable_network_policy -- Dataplane V2 makes it redundant and they conflict.
  datapath_provider = "ADVANCED_DATAPATH"

  gateway_api_config {
    channel = "CHANNEL_STANDARD"
  }

  # Ephemeral portfolio project -- disable deletion protection
  deletion_protection = false

  resource_labels = {
    environment = var.environment
    managed-by  = "opentofu"
  }
}

# -----------------------------------------------------------------------------
# Node Pool (separate resource -- NEVER define inline in cluster)
# -----------------------------------------------------------------------------

resource "google_container_node_pool" "primary" {
  name     = "${var.project_name}-node-pool-${var.environment}"
  location = var.region
  cluster  = google_container_cluster.primary.name

  node_count = var.node_count

  node_config {
    spot         = var.spot_nodes
    machine_type = var.machine_type

    service_account = var.node_service_account
    oauth_scopes    = ["https://www.googleapis.com/auth/cloud-platform"]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      environment = var.environment
    }
  }
}
