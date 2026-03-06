# -----------------------------------------------------------------------------
# Dev Environment - Variable Values
# -----------------------------------------------------------------------------
# Development environment: cost-optimized with Spot nodes and minimal sizing.
# -----------------------------------------------------------------------------

project_id   = "your-project-id" # UPDATE: Set to your GCP project ID
environment  = "dev"
region       = "us-central1"
project_name = "cloudmart"

# GKE -- small Spot nodes for cost efficiency
machine_type = "e2-medium"
node_count   = 2
spot_nodes   = true

# Cloud SQL -- minimal tier for development
# WARNING: db-f1-micro has ~25 connection limit
# Set HikariCP pool to 2-3 (Java), SQLAlchemy pool to 2-3 (Python)
db_tier = "db-f1-micro"

# Networking
authorized_cidr = "0.0.0.0/0" # UPDATE: Set to your IP/32 for security
master_cidr     = "172.16.0.0/28"
