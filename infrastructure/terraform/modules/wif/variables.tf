# -----------------------------------------------------------------------------
# WIF Module - Variable Declarations
# -----------------------------------------------------------------------------
# Inputs for Workload Identity Federation (GitHub Actions OIDC auth).
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
