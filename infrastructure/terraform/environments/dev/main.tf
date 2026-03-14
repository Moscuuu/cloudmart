# -----------------------------------------------------------------------------
# Dev Environment - Module Composition
# -----------------------------------------------------------------------------
# Wires all 7 infrastructure modules together, passing outputs between
# dependent modules. This file is identical across all environments;
# only terraform.tfvars and backend.tf differ per environment.
#
# Module dependency graph:
#   networking ──> gke (network_id, subnet_id, ranges)
#   networking ──> database (network_id, private_vpc_connection_id)
#   networking ──> bastion (network_id, subnet_id)
#   iam ────────> gke (node_service_account)
#   iam ────────> bastion (bastion_service_account)
#   registry, pubsub are independent
# -----------------------------------------------------------------------------

# --- Networking (VPC, subnets, Cloud NAT, firewall, VPC peering) ---
module "networking" {
  source          = "../../modules/networking"
  project_name    = var.project_name
  environment     = var.environment
  region          = var.region
  authorized_cidr = var.authorized_cidr
}

# --- IAM (service accounts, Workload Identity bindings) ---
module "iam" {
  source       = "../../modules/iam"
  project_id   = var.project_id
  project_name = var.project_name
  environment  = var.environment
}

# --- GKE Cluster (private cluster with authorized networks) ---
module "gke" {
  source              = "../../modules/gke"
  project_id          = var.project_id
  project_name        = var.project_name
  environment         = var.environment
  region              = var.region
  zone                = var.zone
  network_id          = module.networking.network_id
  subnet_id           = module.networking.subnet_id
  pods_range_name     = module.networking.pods_range_name
  services_range_name = module.networking.services_range_name
  master_cidr         = var.master_cidr
  authorized_cidr     = var.authorized_cidr
  machine_type        = var.machine_type
  node_count          = var.node_count
  spot_nodes          = var.spot_nodes
  node_service_account = module.iam.gke_node_service_account_email
}

# --- Cloud SQL PostgreSQL (private IP via VPC peering) ---
module "database" {
  source                   = "../../modules/database"
  project_name             = var.project_name
  environment              = var.environment
  region                   = var.region
  network_id               = module.networking.network_id
  db_tier                  = var.db_tier
  private_vpc_connection_id = module.networking.private_vpc_connection_id

  depends_on = [module.networking] # VPC peering must exist before Cloud SQL
}

# --- Artifact Registry (Docker image storage) ---
module "registry" {
  source       = "../../modules/registry"
  project_name = var.project_name
  project_id   = var.project_id
  region       = var.region
  environment  = var.environment
}

# --- Pub/Sub (async messaging between services) ---
module "pubsub" {
  source      = "../../modules/pubsub"
  environment = var.environment
}

# --- Bastion Host (secure SSH access to private cluster) ---
module "bastion" {
  source                  = "../../modules/bastion"
  project_name            = var.project_name
  environment             = var.environment
  region                  = var.region
  zone                    = var.zone
  subnet_id               = module.networking.subnet_id
  network_id              = module.networking.network_id
  bastion_service_account = module.iam.bastion_service_account_email
  authorized_cidr         = var.authorized_cidr
}

# --- Workload Identity Federation (GitHub Actions OIDC auth) ---
module "wif" {
  source         = "../../modules/wif"
  project_id     = var.project_id
  project_name   = var.project_name
  project_number = var.project_number
  github_org     = var.github_org
  github_repo    = var.github_repo
}
