# -----------------------------------------------------------------------------
# IAM Module - Outputs
# -----------------------------------------------------------------------------
# These outputs are consumed by downstream modules:
#   - GKE module: gke_node_service_account_email (node pool config)
#   - Bastion module: bastion_service_account_email (VM config)
#   - Phase 5 KSA annotations: product/order SA emails
# -----------------------------------------------------------------------------

output "gke_node_service_account_email" {
  description = "Email of the GKE node service account (for node pool configuration)"
  value       = google_service_account.gke_nodes.email
}

output "product_service_sa_email" {
  description = "Email of the Product Service GSA (for KSA annotation in Phase 5)"
  value       = google_service_account.product_service.email
}

output "order_service_sa_email" {
  description = "Email of the Order Service GSA (for KSA annotation in Phase 5)"
  value       = google_service_account.order_service.email
}

output "bastion_service_account_email" {
  description = "Email of the bastion host service account (for VM configuration)"
  value       = google_service_account.bastion.email
}
