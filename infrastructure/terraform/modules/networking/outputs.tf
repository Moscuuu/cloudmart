# -----------------------------------------------------------------------------
# Networking Module - Outputs
# -----------------------------------------------------------------------------
# These outputs are consumed by downstream modules:
#   - GKE module: network_id, subnet_id, pods_range_name, services_range_name
#   - Database module: network_id (for VPC peering dependency)
#   - Bastion module: network_id, subnet_id
# -----------------------------------------------------------------------------

output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "subnet_id" {
  description = "The ID of the primary subnet"
  value       = google_compute_subnetwork.primary.id
}

output "subnet_name" {
  description = "The name of the primary subnet"
  value       = google_compute_subnetwork.primary.name
}

output "pods_range_name" {
  description = "The name of the secondary range for GKE pods"
  value       = "pods"
}

output "services_range_name" {
  description = "The name of the secondary range for GKE services"
  value       = "services"
}
