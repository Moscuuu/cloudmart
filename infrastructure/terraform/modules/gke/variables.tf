variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "GCP region for the cluster"
  type        = string
}

variable "zone" {
  description = "GCP zone for zonal cluster (set to make dev cluster single-zone, avoiding SSD quota limits)"
  type        = string
  default     = null
}

variable "network_id" {
  description = "VPC network ID from networking module"
  type        = string
}

variable "subnet_id" {
  description = "Subnet self_link from networking module"
  type        = string
}

variable "pods_range_name" {
  description = "Name of the secondary IP range for pods"
  type        = string
  default     = "pods"
}

variable "services_range_name" {
  description = "Name of the secondary IP range for services"
  type        = string
  default     = "services"
}

variable "master_cidr" {
  description = "CIDR block for the GKE master's private endpoint"
  type        = string
  default     = "172.16.0.0/28"
}

variable "authorized_cidr" {
  description = "CIDR block authorized to access the Kubernetes master (e.g., your IP)"
  type        = string
}

variable "machine_type" {
  description = "Machine type for the node pool"
  type        = string
  default     = "e2-medium"
}

variable "node_count" {
  description = "Number of nodes per zone in the node pool"
  type        = number
  default     = 2
}

variable "spot_nodes" {
  description = "Whether to use Spot VMs for the node pool"
  type        = bool
  default     = true
}

variable "disk_size_gb" {
  description = "Boot disk size in GB for node pool VMs"
  type        = number
  default     = 100
}

variable "node_service_account" {
  description = "Service account email for GKE nodes from IAM module"
  type        = string
}
