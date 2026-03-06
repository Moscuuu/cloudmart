# -----------------------------------------------------------------------------
# Networking Module - Main
# -----------------------------------------------------------------------------
# Creates VPC, subnet with secondary ranges for GKE pods/services,
# Cloud NAT for private node internet access, VPC peering for Cloud SQL
# private IP, and firewall rules.
#
# Anti-patterns avoided:
#   - Never auto-mode VPC (always custom with explicit subnets)
#   - Always define secondary ranges explicitly for GKE
# -----------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# 1. VPC Network (custom mode -- no auto-created subnets)
# ---------------------------------------------------------------------------
resource "google_compute_network" "vpc" {
  name                    = "${var.project_name}-vpc"
  auto_create_subnetworks = false
  description             = "Custom VPC for ${var.project_name} ${var.environment} environment"
}

# ---------------------------------------------------------------------------
# 2. Subnet with secondary ranges for GKE pods and services
# ---------------------------------------------------------------------------
resource "google_compute_subnetwork" "primary" {
  name          = "${var.project_name}-subnet-${var.environment}"
  ip_cidr_range = "10.0.0.0/20" # 4,096 node IPs
  region        = var.region
  network       = google_compute_network.vpc.id

  # Secondary range for GKE pods
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14" # ~262k pod IPs
  }

  # Secondary range for GKE services
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20" # 4,096 service IPs
  }

  # Allow instances without external IPs to reach Google APIs
  private_ip_google_access = true
}

# ---------------------------------------------------------------------------
# 3. Reserved IP range for Cloud SQL VPC peering
# ---------------------------------------------------------------------------
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.project_name}-private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
  description   = "Reserved IP range for Cloud SQL private IP connectivity"
}

# ---------------------------------------------------------------------------
# 4. VPC peering connection for Cloud SQL private IP
# ---------------------------------------------------------------------------
# Cloud SQL instances use this peering to get private IPs within the VPC.
# The database module must depend on this connection being established.
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# ---------------------------------------------------------------------------
# 5. Cloud Router (required for Cloud NAT)
# ---------------------------------------------------------------------------
resource "google_compute_router" "router" {
  name    = "${var.project_name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

# ---------------------------------------------------------------------------
# 6. Cloud NAT -- enables private GKE nodes to pull container images
# ---------------------------------------------------------------------------
# Without Cloud NAT, private nodes cannot reach Docker Hub, gcr.io, or
# other external registries, causing ImagePullBackOff errors.
resource "google_compute_router_nat" "nat" {
  name                               = "${var.project_name}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ---------------------------------------------------------------------------
# 7. Firewall: allow all internal traffic within VPC
# ---------------------------------------------------------------------------
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.project_name}-allow-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  # Allow traffic from the primary subnet and both secondary ranges
  source_ranges = [
    "10.0.0.0/20",  # Node subnet
    "10.4.0.0/14",  # Pods secondary range
    "10.8.0.0/20",  # Services secondary range
  ]

  description = "Allow all internal traffic within the VPC"
}

# ---------------------------------------------------------------------------
# 8. Firewall: allow SSH to bastion from authorized CIDR
# ---------------------------------------------------------------------------
resource "google_compute_firewall" "allow_bastion_ssh" {
  name    = "${var.project_name}-allow-bastion-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = [var.authorized_cidr]
  target_tags   = ["bastion"]

  description = "Allow SSH access to bastion host from authorized CIDR"
}
