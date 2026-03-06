# -----------------------------------------------------------------------------
# Networking Module - Variables
# -----------------------------------------------------------------------------
# This module creates the VPC, subnet, Cloud NAT, and firewall rules.
# It does NOT receive a network_id -- it CREATES the network.
# -----------------------------------------------------------------------------

variable "project_name" {
  description = "Project name used in resource naming (e.g., cloudmart)"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "region" {
  description = "GCP region for networking resources"
  type        = string
}

variable "authorized_cidr" {
  description = "CIDR block for authorized access (user's IP for bastion SSH and master authorized networks)"
  type        = string
}
