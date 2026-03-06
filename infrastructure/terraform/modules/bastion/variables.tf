variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP region for the bastion host"
  type        = string
}

variable "subnet_id" {
  description = "Subnet self_link from networking module"
  type        = string
}

variable "network_id" {
  description = "VPC network ID from networking module"
  type        = string
}

variable "bastion_service_account" {
  description = "Service account email for the bastion host from IAM module"
  type        = string
}

variable "authorized_cidr" {
  description = "CIDR block authorized for SSH access (used by networking module firewall rule)"
  type        = string
}
