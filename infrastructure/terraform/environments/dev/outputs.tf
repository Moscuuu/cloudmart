# -----------------------------------------------------------------------------
# Dev Environment - Outputs
# -----------------------------------------------------------------------------
# Exposes key values from all modules for use by CI/CD, deployment scripts,
# and downstream phases.
# -----------------------------------------------------------------------------

# --- GKE Cluster ---
output "cluster_name" {
  description = "Name of the GKE cluster"
  value       = module.gke.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for the GKE cluster API server"
  value       = module.gke.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Base64-encoded CA certificate for the cluster"
  value       = module.gke.cluster_ca_certificate
  sensitive   = true
}

# --- Cloud SQL ---
output "database_instance_connection_name" {
  description = "Connection name for Cloud SQL Auth Proxy (project:region:instance)"
  value       = module.database.instance_connection_name
}

output "database_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = module.database.private_ip_address
  sensitive   = true
}

# --- Artifact Registry ---
output "registry_url" {
  description = "Full Docker repository URL for pushing/pulling images"
  value       = module.registry.repository_url
}

# --- Bastion ---
output "bastion_external_ip" {
  description = "External (NAT) IP address of the bastion host"
  value       = module.bastion.bastion_external_ip
}

# --- Pub/Sub ---
output "order_placed_topic_name" {
  description = "Name of the order-placed Pub/Sub topic"
  value       = module.pubsub.order_placed_topic_name
}

# --- IAM (for Phase 5 KSA annotation) ---
output "product_service_sa_email" {
  description = "Email of the Product Service GSA (for KSA annotation)"
  value       = module.iam.product_service_sa_email
}

output "order_service_sa_email" {
  description = "Email of the Order Service GSA (for KSA annotation)"
  value       = module.iam.order_service_sa_email
}
