output "bastion_external_ip" {
  description = "External (NAT) IP address of the bastion host"
  value       = google_compute_instance.bastion.network_interface[0].access_config[0].nat_ip
}

output "bastion_name" {
  description = "Name of the bastion host instance"
  value       = google_compute_instance.bastion.name
}

output "bastion_internal_ip" {
  description = "Internal IP address of the bastion host"
  value       = google_compute_instance.bastion.network_interface[0].network_ip
}
