variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP region for the Cloud SQL instance"
  type        = string
}

variable "network_id" {
  description = "VPC network self_link for private IP configuration"
  type        = string
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "private_vpc_connection_id" {
  description = "ID of the VPC peering connection (google_service_networking_connection). Pass this to ensure the module waits for VPC peering to complete before creating the instance."
  type        = string
}
