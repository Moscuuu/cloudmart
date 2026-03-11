# Infrastructure

GCP infrastructure provisioned via OpenTofu with Ansible for bastion host configuration.

## Terraform Modules

Located in `terraform/modules/`:

| Module | Purpose |
|---|---|
| `networking` | VPC, subnets, secondary ranges, Cloud NAT, firewall rules, VPC peering for Cloud SQL |
| `gke` | GKE cluster and node pool with Workload Identity, Dataplane V2 |
| `database` | Cloud SQL PostgreSQL instance (private IP) with product and order databases |
| `registry` | Artifact Registry Docker repository |
| `pubsub` | Pub/Sub topics and subscriptions for async messaging |
| `iam` | Service accounts and IAM bindings for Workload Identity |
| `bastion` | Bastion host VM for cluster access via IAP tunnel |
| `wif` | Workload Identity Federation for GitHub Actions CI/CD |

## Environments

Located in `terraform/environments/`:

| Environment | Purpose |
|---|---|
| `dev` | Development (zonal cluster, minimal resources) |
| `staging` | Staging (mirrors production topology, reduced scale) |
| `prod` | Production (regional cluster, full resources) |

Environments share the same module definitions and differentiate only through `terraform.tfvars` and `backend.tf`.

## Provisioning Commands

```bash
cd infrastructure/terraform/environments/dev

# Initialize providers and backend
tofu init

# Preview changes
tofu plan -out=plan.tfplan

# Apply changes
tofu apply plan.tfplan

# View outputs (bastion IP, cluster name, etc.)
tofu output
```

## Ansible Configuration

Located in `ansible/`:

### Roles

| Role | Purpose |
|---|---|
| `common` | Base OS packages, SSH hardening, system configuration |
| `k8s-tools` | kubectl, Helm, ArgoCD CLI, GKE auth plugin |

### Running Playbooks

Ansible runs from a Linux environment (e.g., WSL2 or Cloud Shell) with a Python virtual environment.

```bash
# Activate virtual environment
source ~/ansible-venv/bin/activate

# Run bastion setup
ansible-playbook -i inventory/hosts playbooks/setup-bastion.yml

# Run tools-only install
ansible-playbook -i inventory/hosts playbooks/install-tools.yml
```

### Connecting to Bastion

The recommended method is IAP tunnel (no public SSH key required):

```bash
gcloud compute ssh bastion --zone us-east1-b --tunnel-through-iap
```

## Key Design Decisions

- **Custom-mode VPC** with explicit subnets and secondary IP ranges (never auto-mode)
- **Workload Identity** for secure pod-to-GCP authentication without static keys
- **Dataplane V2** (Cilium-based) for network policy enforcement
- **Cloud SQL private IP** via VPC peering (no public endpoint)
- **Cloud NAT** with AUTO_ONLY IP allocation for outbound internet from private nodes
- **GKE node pool as separate resource** to avoid lifecycle conflicts with cluster updates
- **Version-pinned tools** on bastion: kubectl v1.31.4, Helm v3.17.1, ArgoCD CLI v2.14.3
- **IAP tunnel** as the recommended SSH connection method for bastion access
