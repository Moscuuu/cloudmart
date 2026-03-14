# -----------------------------------------------------------------------------
# Dev Environment - Variable Declarations
# -----------------------------------------------------------------------------
# All variables consumed by module wiring in main.tf.
# Values are set in terraform.tfvars (environment-specific).
# -----------------------------------------------------------------------------

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "cloudmart"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "GCP region for all resources"
  type        = string
  default     = "us-central1"
}

# Zone (zonal GKE + bastion placement — keeps dev under SSD quota)
variable "zone" {
  description = "GCP zone for zonal resources (GKE cluster, bastion)"
  type        = string
}

# GKE
variable "machine_type" {
  description = "Machine type for GKE node pool"
  type        = string
}

variable "node_count" {
  description = "Number of nodes per zone in the GKE node pool"
  type        = number
}

variable "spot_nodes" {
  description = "Whether to use Spot VMs for GKE node pool (cost savings for non-prod)"
  type        = bool
}

variable "disk_size_gb" {
  description = "Boot disk size in GB for GKE node pool VMs"
  type        = number
  default     = 100
}

# Cloud SQL
variable "db_tier" {
  description = "Cloud SQL machine tier (e.g., db-f1-micro, db-g1-small)"
  type        = string
}

# Networking
variable "authorized_cidr" {
  description = "Your IP in CIDR format (e.g., 1.2.3.4/32) for GKE master and bastion SSH access"
  type        = string
}

variable "master_cidr" {
  description = "CIDR block for the GKE master's private endpoint"
  type        = string
  default     = "172.16.0.0/28"
}

# WIF (Workload Identity Federation)
variable "project_number" {
  description = "GCP project number for WIF provider path"
  type        = string
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
  default     = "Moscuuu"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "cloudmart"
}
