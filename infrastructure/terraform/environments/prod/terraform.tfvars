# -----------------------------------------------------------------------------
# Prod Environment - Variable Values
# -----------------------------------------------------------------------------
# Production sizing -- not deployed, demonstrates multi-env capability.
# Larger instances, stable (non-Spot) nodes, higher connection limits.
# -----------------------------------------------------------------------------

project_id   = "your-project-id" # UPDATE: Set to your GCP project ID
environment  = "prod"
region       = "us-central1"
project_name = "cloudmart"

# GKE -- larger stable nodes for production workloads
machine_type = "e2-standard-2"
node_count   = 3
spot_nodes   = false # Stable nodes for production reliability

# Cloud SQL -- larger tier for production traffic
# db-g1-small supports ~100 connections
db_tier = "db-g1-small"

# Networking
authorized_cidr = "0.0.0.0/0" # UPDATE: Set to your IP/32 for security
master_cidr     = "172.16.0.0/28"
