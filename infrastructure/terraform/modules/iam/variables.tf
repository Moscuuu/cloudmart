# -----------------------------------------------------------------------------
# IAM Module - Variables
# -----------------------------------------------------------------------------
# This module creates Google Service Accounts with Workload Identity bindings
# for pod-level GCP authentication (no service account key files).
# -----------------------------------------------------------------------------

variable "project_id" {
  description = "GCP project ID (used for Workload Identity pool reference)"
  type        = string
}

variable "project_name" {
  description = "Project name used in resource naming (e.g., cloudmart)"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod) -- used in Workload Identity KSA namespace binding"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}
