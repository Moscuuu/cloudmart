# Kubernetes Manifests

Kustomize-based manifest structure for multi-environment deployment of CloudMart on GKE.

## Directory Structure

```
k8s/
├── base/                    # Shared manifests (all environments)
│   ├── product-service/     # Deployment, Service, ConfigMap
│   ├── order-service/       # Deployment, Service, ConfigMap
│   ├── frontend/            # Deployment, Service, ConfigMap
│   ├── redis/               # Redis deployment
│   ├── network-policies/    # Default-deny + per-service allow-list
│   ├── rbac/                # Namespace-scoped roles and bindings
│   └── secrets/             # Secret templates (stringData placeholders)
├── overlays/                # Environment-specific patches
│   ├── dev/                 # Development (small resources, auto-sync)
│   ├── staging/             # Staging (medium resources, manual sync)
│   └── prod/                # Production (full resources, manual sync)
└── platform/                # Cluster-wide platform components
    ├── monitoring/          # Prometheus, Grafana, Loki, Tempo, Alloy
    ├── argocd/              # ArgoCD app-of-apps configuration
    └── gateway/             # GKE Gateway API resources
```

## Base + Overlay Pattern

CloudMart uses the Kustomize base/overlay pattern for environment management:

- **Base** contains the canonical manifests shared across all environments. Resource limits, image names, and replica counts are set to sensible defaults.
- **Overlays** patch the base for each environment, modifying resource limits, replica counts, image tags (pointing to Artifact Registry), and Workload Identity annotations.

### Building Manifests

```bash
# Preview rendered manifests for an environment
kustomize build k8s/overlays/dev

# Apply to cluster
kubectl apply -k k8s/overlays/dev
```

### Resource Sizing by Environment

| Resource | Dev | Staging | Prod |
|---|---|---|---|
| CPU request | 100m | 250m | 500m |
| Memory request | 256Mi | 512Mi | 1Gi |
| Replicas | 1 | 1 | 2+ |

## Security Resources

### Network Policies

Located in `base/network-policies/`. Implements a default-deny + allow-list approach:

| Policy | Purpose |
|---|---|
| `default-deny.yaml` | Deny all ingress and egress by default |
| `allow-dns.yaml` | Allow DNS resolution (kube-dns) for all pods |
| `frontend.yaml` | Allow ingress from Gateway, egress to backend services |
| `product-service.yaml` | Allow ingress from frontend/order-service, egress to Cloud SQL and Pub/Sub |
| `order-service.yaml` | Allow ingress from frontend, egress to Cloud SQL, Redis, Product Service, Pub/Sub |
| `redis.yaml` | Allow ingress from Order Service only |

### RBAC

Located in `base/rbac/`:

| Resource | Purpose |
|---|---|
| `namespace-admin.yaml` | Full access within the namespace (for CI/CD service accounts) |
| `namespace-viewer.yaml` | Read-only access within the namespace (for monitoring) |

### Secrets

Located in `base/secrets/`. Templates use `stringData` for human-readable placeholder values. Actual values must be populated before applying to a cluster. Secrets are never committed with real values.

## Common Commands

```bash
# Build and preview manifests
kustomize build k8s/overlays/dev

# Apply manifests to cluster
kubectl apply -k k8s/overlays/dev

# View deployed resources
kubectl get all -n cloudmart-dev

# Check network policy enforcement
kubectl get networkpolicies -n cloudmart-dev
```

## Platform Components

The `platform/` directory contains cluster-wide components managed separately from application manifests:

- **Monitoring** -- Prometheus (kube-prometheus-stack), Grafana, Loki, Tempo, Alloy with pre-configured dashboards and alert rules
- **ArgoCD** -- app-of-apps pattern for GitOps deployment across environments
- **Gateway** -- GKE Gateway API resources for HTTP load balancing
