# CloudMart End-to-End Deployment Guide

A battle-tested deployment runbook for CloudMart -- from infrastructure provisioning through service verification. Every command is copy-pasteable, every gotcha is documented from real deployment experience.

---

## Quick Reference

```bash
# Shell variables -- set these once, used throughout the guide
export PROJECT_ID="project-0042e987-ac93-43ec-a4f"
export REGION="us-east1"
export ZONE="us-east1-b"
export CLUSTER_NAME="cloudmart-dev"
export REGISTRY="us-east1-docker.pkg.dev/${PROJECT_ID}/cloudmart-docker"

# Key commands you will use repeatedly
gcloud compute ssh cloudmart-bastion-dev --zone ${ZONE} --tunnel-through-iap
kubectl get pods --all-namespaces | grep -v Running
kubectl logs -n dev deployment/<service-name>
```

---

## 0. Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| `gcloud` CLI | latest | GCP authentication and resource management |
| `tofu` or `terraform` | >= 1.11 | Infrastructure provisioning |
| `kubectl` | >= 1.31 | Kubernetes cluster management |
| `helm` | >= 3.17 | Helm chart deployments |
| `docker` | >= 24 | Container image builds |

### GCP APIs to Enable

```bash
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  iap.googleapis.com \
  pubsub.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project=${PROJECT_ID}
```

### Authentication

```bash
# Interactive login (opens browser)
gcloud auth login

# Application Default Credentials (required for Terraform/OpenTofu)
gcloud auth application-default login

# Set active project
gcloud config set project ${PROJECT_ID}
```

---

## 1. Infrastructure Provisioning (OpenTofu)

OpenTofu provisions the entire GCP infrastructure: VPC, GKE cluster, Cloud SQL, Pub/Sub, Artifact Registry, bastion host, and IAM bindings.

### Apply Infrastructure

```bash
cd infrastructure/terraform/environments/dev

# Initialize providers and remote backend
tofu init

# Preview changes
tofu plan -out=plan.tfplan

# Apply (typically takes 10-15 minutes for GKE + Cloud SQL)
tofu apply plan.tfplan
```

### Capture Outputs

```bash
# These values are needed for later steps
tofu output

# Key outputs to note:
#   bastion_name          = "cloudmart-bastion-dev"
#   cluster_name          = "cloudmart-dev"
#   database_private_ip   = "10.x.x.x"    (Cloud SQL private IP)
#   db_password           = "***"           (sensitive -- use: tofu output -raw db_password)
#   artifact_registry_url = "us-east1-docker.pkg.dev/PROJECT_ID/cloudmart-docker"
```

### Warnings and Gotchas

> **WARNING: SSD Quota Limit.** GCP projects have a default 250GB SSD quota per region. A regional GKE cluster creates 3 nodes, each with a boot disk. With the default 100GB disk size, that is 300GB -- exceeding the quota. Set `disk_size_gb = 50` in your `terraform.tfvars` to stay under the limit (50GB x 3 = 150GB for a zonal cluster, or 50GB x 5 = 250GB max).
>
> ```hcl
> # terraform.tfvars
> disk_size_gb = 50
> ```

> **WARNING: Zone Availability.** `us-east1-a` does not exist in GCP. The default zone is `us-east1-b`. If you override the zone, verify it exists first with `gcloud compute zones list --filter="region:us-east1"`.

> **NOTE: Dev Environment Uses Zonal Cluster.** The dev environment creates a zonal (single-zone) GKE cluster to conserve resources. Staging and prod use regional clusters.

> **NOTE: Cloud SQL Soft-Delete.** Cloud SQL instances have deletion protection enabled by default. For dev teardown, set `deletion_protection = false` in tfvars before `tofu destroy`.

> **WARNING: WIF Soft-Delete on Infra Recreate.** When tearing down and recreating infrastructure, Workload Identity Federation pools and providers enter a 30-day soft-delete state. On next `tofu apply`, you get "Error 409: entity already exists" but `tofu import` fails with "non-existent". Fix: undelete the resources first, then import them.
>
> ```bash
> # Undelete the pool and provider
> gcloud iam workload-identity-pools undelete github-actions \
>   --location=global
> gcloud iam workload-identity-pools providers undelete github \
>   --workload-identity-pool=github-actions \
>   --location=global
>
> # Then import into Terraform state
> tofu import <pool_resource_address> <pool_id>
> tofu import <provider_resource_address> <provider_id>
> ```

> **NOTE: Node Count for Multi-Environment Clusters.** When running dev + staging + prod on the same cluster, you need at least 4 nodes (e2-medium). Set `node_count = 4` in your `terraform.tfvars`. Resource requests for staging and prod overlays should be reduced to dev-level (25m CPU) to fit within node capacity. Redis also needs a resource patch (10m CPU / 32Mi memory).

---

## 2. Bastion Host Setup

The GKE cluster is private (no public endpoint). All `kubectl` commands must run from the bastion host, which has private network access to the cluster.

### Provision Bastion with Ansible (Recommended)

Ansible automates the full bastion setup -- installing kubectl, helm, ArgoCD CLI, gke-gcloud-auth-plugin, tofu, and git. Run this from your local machine after infrastructure provisioning.

#### Prerequisites

- Ansible installed locally (e.g., `pip install ansible` or via system package manager)
- SSH private key at `~/.ssh/google_compute_engine` (generated by `gcloud compute ssh` on first use)

#### Update Inventory with Bastion IP

The bastion gets an ephemeral public IP. After each `tofu apply`, update the inventory with the current IP:

```bash
# Get the bastion IP from Terraform outputs
cd infrastructure/terraform/environments/dev
tofu output bastion_ip

# Edit the inventory file with the new IP
# infrastructure/ansible/inventory/dev.yml
#   ansible_host: "<BASTION_IP>"
```

> **WARNING: Bastion IP changes on recreate.** The bastion uses an ephemeral IP. Every time infrastructure is destroyed and recreated, you must update `infrastructure/ansible/inventory/dev.yml` with the new IP from `tofu output`.

#### Run the Playbook

```bash
cd infrastructure/ansible
ansible-playbook playbooks/setup-bastion.yml
```

#### What It Installs

| Tool | Purpose |
|------|---------|
| `kubectl` | Kubernetes cluster management |
| `helm` | Helm chart deployments |
| `argocd` | ArgoCD CLI for GitOps management |
| `gke-gcloud-auth-plugin` | GKE authentication plugin for kubectl |
| `tofu` | OpenTofu for infrastructure management |
| `git` | Repository cloning on bastion |

#### Verify Installation

SSH to the bastion and confirm all tools are available:

```bash
gcloud compute ssh cloudmart-bastion-dev \
  --zone ${ZONE} \
  --tunnel-through-iap \
  --project ${PROJECT_ID}

# Check tool versions
kubectl version --client
helm version --short
argocd version --client
tofu version
```

### Connect to Bastion

```bash
# SSH via IAP tunnel (no SSH keys needed)
gcloud compute ssh cloudmart-bastion-dev \
  --zone ${ZONE} \
  --tunnel-through-iap \
  --project ${PROJECT_ID}
```

### Initial Setup on Bastion

```bash
# Clone the repository
git clone https://github.com/Moscuuu/cloudmart.git
cd cloudmart

# Get GKE credentials
gcloud container clusters get-credentials ${CLUSTER_NAME} \
  --zone ${ZONE} \
  --project ${PROJECT_ID} \
  --internal-ip

# Verify cluster access
kubectl get nodes
```

> **WARNING: Always use `--internal-ip` flag.** The GKE cluster has no public endpoint. Without `--internal-ip`, `kubectl` will try to connect to a non-existent public endpoint and time out.

> **WARNING: Bastion SA Needs `container.admin`.** The bastion service account requires `roles/container.admin` (not just `container.developer`) to run Helm installs that create ClusterRoleBindings, webhooks, and CRDs (cert-manager, ArgoCD). This is already configured in the Terraform IAM module.

---

## 3. Platform Deployment

The platform deployment script installs the shared infrastructure components in the correct order. Run this on the bastion host.

### Option A: Automated Deployment (Recommended)

```bash
# From repo root on bastion
./k8s/platform/deploy-platform.sh
```

> **WARNING: deploy-platform.sh SIGPIPE.** The script uses `set -euo pipefail`. Commands like `kubectl cluster-info | head -2` cause SIGPIPE (exit 141) which silently kills the script. This is already fixed in the script with `|| true`.

The script requires database credentials. Either pass them as environment variables or run from the Terraform directory.

### Option B: Pass Credentials via Environment Variables

```bash
DB_PASSWORD=$(tofu output -raw db_password) \
CLOUD_SQL_IP=$(tofu output -raw database_private_ip) \
  ./k8s/platform/deploy-platform.sh
```

### Option C: Create Secrets from Terraform Directory

```bash
# SSH to bastion, then:
cd infrastructure/terraform/environments/dev
bash ../../../../k8s/overlays/dev/create-secrets.sh

# Then run the platform script (secrets already exist, script skips step 3)
cd ~/cloudmart
./k8s/platform/deploy-platform.sh
```

### What the Script Deploys (in order)

#### Step 1: Cert-Manager

Installs cert-manager for TLS certificate management. Uses `crds.enabled=true` in the Helm chart values.

> **WARNING: Use `crds.enabled=true`, NOT `crds.installCRDs=true`.** The `installCRDs` parameter is deprecated in newer cert-manager Helm charts. Using the wrong parameter silently skips CRD installation, causing all Certificate resources to fail.

#### Step 2: Gateway API Resources

Creates the Gateway namespace, Gateway resource, HTTPRoutes, and ClusterIssuer. Application namespaces (`dev`, `staging`, `prod`) are created first since HTTPRoutes reference them.

> **NOTE: HTTP-only listener.** The Gateway is configured for HTTP (port 80) only. TLS is deferred until a real domain is available. The self-signed ClusterIssuer exists for future use.

#### Step 3: Secrets

Creates two secrets in the dev namespace:
- `db-credentials` -- database password and order-service connection string
- `auth-secrets` -- JWT signing secret, OAuth client ID, OAuth client secret

The `create-secrets.sh` script also updates ConfigMap patches with the Cloud SQL IP address.

#### Step 4: ArgoCD

Installs ArgoCD via Helm with custom values, then bootstraps the app-of-apps pattern. ArgoCD gets a LoadBalancer service for easy external access.

```bash
# Get ArgoCD initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo

# Get ArgoCD external IP
kubectl get svc argocd-server -n argocd \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

#### Step 5: Monitoring Stack

> **PREREQUISITE: Create `grafana-admin` secret before installing monitoring.** The kube-prometheus-stack values reference `existingSecret: grafana-admin`. This secret must exist in the monitoring namespace BEFORE running the monitoring install.
>
> ```bash
> kubectl create secret generic grafana-admin -n monitoring \
>   --from-literal=user=admin \
>   --from-literal=password=prom-operator
> ```

Installs the full observability stack via `k8s/platform/monitoring/install.sh`:
- **kube-prometheus-stack** (Prometheus + Grafana + Alertmanager)
- **Loki** (log aggregation)
- **Tempo** (distributed tracing)
- **Alloy Logs** (DaemonSet log collector)
- **Alloy Traces** (Deployment OTLP receiver)

> **WARNING: CPU resource sizing for e2-medium nodes.** The monitoring values files are pre-configured with reduced CPU requests suitable for e2-medium nodes: Prometheus 50m, Loki 50m, Tempo 50m, Alloy 25m. If you modify these, ensure total requests fit within node capacity.

> **NOTE: Alertmanager uses a null receiver by default.** Slack alerting is optional. To enable it, edit `alerts/slack-webhook-secret.yaml` with your webhook URL and apply before running the install script.

> **NOTE: Grafana default password.** Unless `adminPassword` is explicitly set in the kube-prometheus-stack values, Grafana generates a random password. The default configuration sets it to `prom-operator`. Access Grafana at:
>
> ```bash
> kubectl get svc kube-prometheus-stack-grafana -n monitoring \
>   -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
> # Login: admin / prom-operator
> ```

---

## 4. Build and Push Container Images

Build all three service images and push to Artifact Registry. Run these commands from your development machine (not the bastion).

### Authenticate Docker

```bash
gcloud auth configure-docker us-east1-docker.pkg.dev
```

### Build and Push Product Service

```bash
cd services/product-service

docker build \
  -t ${REGISTRY}/product-service:latest .

docker push ${REGISTRY}/product-service:latest
```

The product-service Dockerfile uses a multi-stage build: Maven 3.9.9 with Eclipse Temurin 21 for building, and Temurin 21 JRE Alpine for runtime. It includes the OpenTelemetry Java agent for distributed tracing.

### Build and Push Order Service

```bash
cd services/order-service

docker build \
  -t ${REGISTRY}/order-service:latest .

docker push ${REGISTRY}/order-service:latest
```

The order-service Dockerfile uses a two-phase uv sync: first `--no-install-project` for dependency caching, then a full sync after copying source. Runtime uses `opentelemetry-instrument` for auto-instrumentation.

### Build and Push Frontend

```bash
cd services/frontend

docker build \
  --build-arg VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
  -t ${REGISTRY}/frontend:latest .

docker push ${REGISTRY}/frontend:latest
```

> **WARNING: Frontend build args are baked in at build time.** Vite embeds `VITE_*` environment variables during `pnpm build`. You must rebuild the frontend image whenever the OAuth Client ID or API base URL changes. The `VITE_GOOGLE_CLIENT_ID` arg must be set during build -- it cannot be injected at runtime.

> **NOTE: API base URL.** The frontend uses the Gateway API for routing, so the API base URL is relative (same origin). You do NOT need to set `VITE_API_BASE_URL` unless the frontend is served from a different origin than the API.

---

## 5. Database Seeding

### Product Database

The product database schema is auto-created by Hibernate (`ddl-auto: update`), but data must be seeded manually. Use the provided seed script on the bastion.

```bash
# On the bastion, from repo root
./k8s/platform/seed-data.sh dev
```

The script:
1. Reads database credentials from the `db-credentials` secret
2. Creates a ConfigMap from `services/product-service/src/main/resources/data.sql`
3. Runs a PostgreSQL Job that executes the SQL file against the productdb
4. Cleans up the ConfigMap after completion

> **WARNING: Network policies block unlabeled pods.** The default-deny network policy only allows traffic from pods with matching labels. The seed Job must have `app: product-service` labels on its pod template -- the `seed-data.sh` script already includes this label.

> **NOTE: Spring Boot `sql.init.mode: never` in GKE profile.** The product service has `sql.init.mode: never` in its GKE/production profile to prevent Spring Boot from re-running data.sql on every restart. Schema creation is handled by Hibernate's `ddl-auto: update`. Data seeding is a one-time manual operation via the seed script.

### Order Database (Alembic Migration)

The order service uses Alembic for schema management. The migration must run before the service starts for the first time.

```bash
# Create a ConfigMap with the Alembic migration SQL
# This creates the orderstatus enum, orders table, order_items table, and alembic_version
cat <<'EOF' | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: alembic-migrate
  namespace: dev
  labels:
    app: order-service
spec:
  backoffLimit: 1
  ttlSecondsAfterFinished: 300
  template:
    metadata:
      labels:
        app: order-service
    spec:
      restartPolicy: Never
      containers:
      - name: alembic
        image: us-east1-docker.pkg.dev/project-0042e987-ac93-43ec-a4f/cloudmart-docker/order-service:latest
        command: ["alembic", "upgrade", "head"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: database-url
EOF

# Wait for migration to complete
kubectl wait --for=condition=complete job/alembic-migrate \
  -n dev --timeout=120s

# Check migration logs
kubectl logs job/alembic-migrate -n dev

# Clean up
kubectl delete job alembic-migrate -n dev
```

> **WARNING: `kubectl run --rm -i` fails through SSH tunnels.** Interactive commands do not work reliably when connected to the bastion via IAP tunnel. Always use the ConfigMap+Job pattern for running one-off commands in the cluster.

> **NOTE: Alembic `%` escape in database URLs.** If your database password contains `%` characters, the configparser used by `alembic.ini` may break. This is already fixed in the codebase -- the order service reads `DATABASE_URL` directly from the environment, bypassing `alembic.ini` parsing.

---

## 6. Deploy Application Services

Apply the Kustomize overlay to deploy all application services (product-service, order-service, frontend, Redis).

```bash
# On the bastion, from repo root
kubectl apply -k k8s/overlays/dev/

# Watch pods come up
kubectl get pods -n dev -w

# Wait for all deployments to be ready
kubectl rollout status deployment/product-service -n dev --timeout=300s
kubectl rollout status deployment/order-service -n dev --timeout=300s
kubectl rollout status deployment/frontend -n dev --timeout=300s
```

### Verify Gateway

```bash
# Get the Gateway external IP
export GATEWAY_IP=$(kubectl get gateway cloudmart-gateway -n gateway \
  -o jsonpath='{.status.addresses[0].value}')
echo "Gateway IP: ${GATEWAY_IP}"

# The Gateway IP may take 2-3 minutes to be assigned
# If empty, wait and retry
```

### What Gets Deployed

The Kustomize overlay deploys:
- **product-service** -- Spring Boot API (port 8080)
- **order-service** -- FastAPI API (port 8000)
- **frontend** -- Nginx serving React SPA (port 80)
- **redis** -- Redis 7.4 Alpine for order-service caching
- **network-policies** -- Default-deny with allow rules for labeled pods
- **rbac** -- Service accounts with Workload Identity annotations
- **nginx-config** -- ConfigMap for frontend nginx configuration

Image references are resolved via the kustomization.yaml `images` section, pointing to:
```
us-east1-docker.pkg.dev/project-0042e987-ac93-43ec-a4f/cloudmart-docker/<service>:latest
```

---

## 7. OAuth Setup (Google Cloud Console)

Google OAuth is required for user authentication.

### Create OAuth Client

1. Go to [GCP Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: `CloudMart Dev`
5. Authorized JavaScript origins:
   ```
   http://<GATEWAY_IP>.nip.io
   ```
   Example: `http://34-128-150-212.nip.io`

6. Authorized redirect URIs:
   ```
   http://<GATEWAY_IP>.nip.io/auth/callback
   ```
7. Click **Create** and copy the Client ID and Client Secret

> **WARNING: Google OAuth rejects bare IP addresses.** You cannot use `http://34.128.150.212` as an origin -- Google requires a domain name. Use [nip.io](https://nip.io) as a free wildcard DNS: replace dots with dashes and append `.nip.io`. Example: IP `34.128.150.212` becomes `34-128-150-212.nip.io`.

> **WARNING: Add the URL to BOTH JavaScript origins AND redirect URIs.** Missing either will cause OAuth failures. The origin is checked during the initial redirect, and the redirect URI is validated when Google calls back.

### Update Kubernetes Secrets

```bash
# On the bastion
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="your-client-secret"

# Get existing JWT secret
export JWT_SECRET=$(kubectl get secret auth-secrets -n dev \
  -o jsonpath='{.data.jwt-secret}' | base64 -d)

# Update auth-secrets with OAuth credentials
kubectl create secret generic auth-secrets \
  --namespace=dev \
  --from-literal=jwt-secret="${JWT_SECRET}" \
  --from-literal=oauth-client-id="${GOOGLE_CLIENT_ID}" \
  --from-literal=oauth-client-secret="${GOOGLE_CLIENT_SECRET}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart backend services to pick up new secrets
kubectl rollout restart deployment/product-service deployment/order-service -n dev
```

---

## 8. Frontend Rebuild with OAuth Client ID

After creating the OAuth client, rebuild the frontend image with the Client ID baked in.

```bash
# On your development machine (not bastion)
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GATEWAY_IP="34-128-150-212"  # Use dashes, not dots

cd services/frontend

docker build \
  --build-arg VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
  -t ${REGISTRY}/frontend:latest .

docker push ${REGISTRY}/frontend:latest
```

Then restart the frontend deployment on the bastion:

```bash
# On the bastion
kubectl rollout restart deployment/frontend -n dev

# Wait for rollout
kubectl rollout status deployment/frontend -n dev --timeout=120s
```

---

## 9. Verification Checklist

Run these checks from the bastion to confirm everything is working.

### Health Checks

```bash
export GATEWAY_URL="http://$(kubectl get gateway cloudmart-gateway -n gateway \
  -o jsonpath='{.status.addresses[0].value}').nip.io"

# Product service health
curl -s ${GATEWAY_URL}/api/products/health
# Expected: 200 OK

# Order service health
curl -s ${GATEWAY_URL}/api/orders/health
# Expected: 200 OK
```

### API Verification

```bash
# List products (should return seeded product data)
curl -s ${GATEWAY_URL}/api/products | head -100

# Verify product count
curl -s ${GATEWAY_URL}/api/products | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Products: {len(d.get(\"content\", d)) if isinstance(d, dict) else len(d)}')"
```

### Frontend

Open in a browser:
```
http://<GATEWAY_IP>.nip.io
```
Replace `<GATEWAY_IP>` dots with dashes for nip.io format (e.g., `http://34-128-150-212.nip.io`).

### ArgoCD Dashboard

```bash
# Get ArgoCD external IP
kubectl get svc argocd-server -n argocd \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

Access: `http://<ARGOCD_IP>` -- Login with `admin` and the password above.

### Grafana Dashboard

```bash
# Get Grafana external IP (if LoadBalancer)
kubectl get svc kube-prometheus-stack-grafana -n monitoring \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Or port-forward if ClusterIP
kubectl port-forward svc/kube-prometheus-stack-grafana 3000:80 -n monitoring
```

Access: `http://<GRAFANA_IP>` or `http://localhost:3000` -- Login with `admin` / `prom-operator`.

### All Pods Running

```bash
# Show any pods NOT in Running state
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Per-namespace pod count
for NS in gateway cert-manager argocd monitoring dev; do
  TOTAL=$(kubectl get pods -n ${NS} --no-headers 2>/dev/null | wc -l)
  READY=$(kubectl get pods -n ${NS} --no-headers 2>/dev/null | grep -c Running || true)
  echo "${NS}: ${READY}/${TOTAL} pods running"
done
```

---

## 10. Troubleshooting

### Pods Stuck in ImagePullBackOff

```bash
# Check the pod events
kubectl describe pod <pod-name> -n dev | tail -20

# Common causes:
# 1. Docker not authenticated to Artifact Registry
#    Fix: gcloud auth configure-docker us-east1-docker.pkg.dev
# 2. Image tag does not exist in registry
#    Fix: Verify with: gcloud artifacts docker images list ${REGISTRY}
# 3. GKE nodes cannot pull from Artifact Registry
#    Fix: Check Workload Identity and IAM bindings
```

### Pods in CrashLoopBackOff

```bash
# Check logs
kubectl logs -n dev deployment/product-service --previous
kubectl logs -n dev deployment/order-service --previous

# Common causes:
# 1. Database connection refused -- verify Cloud SQL IP in ConfigMap
# 2. Missing secrets -- verify db-credentials and auth-secrets exist
# 3. Missing environment variables -- check ConfigMap patches
```

### Gateway Returns 404

```bash
# Verify HTTPRoutes exist and reference correct services
kubectl get httproutes -A

# Check HTTPRoute details
kubectl describe httproute -n dev

# Common causes:
# 1. HTTPRoute service name does not match actual service name
# 2. HTTPRoute port does not match service port
# 3. Application namespaces do not exist (HTTPRoutes reference them)
```

### OAuth Errors

```bash
# "redirect_uri_mismatch" error
# Fix: Ensure the nip.io URL in GCP Console matches EXACTLY what the browser uses
#      Check both JavaScript origins and redirect URIs

# "invalid_client" error
# Fix: Verify the OAuth Client ID in auth-secrets matches what you created

# Login button does nothing
# Fix: Rebuild frontend with --build-arg VITE_GOOGLE_CLIENT_ID=<actual-id>
```

### Database Connection Refused

```bash
# Verify Cloud SQL IP in the ConfigMap
kubectl get configmap product-service-config -n dev -o yaml | grep DATASOURCE

# Verify db-credentials secret exists
kubectl get secret db-credentials -n dev

# Test connectivity from a debug pod
cat <<'EOF' | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: debug-db
  namespace: dev
  labels:
    app: product-service
spec:
  restartPolicy: Never
  containers:
  - name: psql
    image: postgres:16-alpine
    command: ["sleep", "3600"]
    env:
    - name: PGPASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password
EOF

# Then exec into it
kubectl exec -it debug-db -n dev -- psql -h <CLOUD_SQL_IP> -U cloudmart -d productdb -c "SELECT 1"

# Clean up
kubectl delete pod debug-db -n dev
```

> **NOTE: Debug pod needs matching labels.** The debug pod must have `app: product-service` (or `app: order-service`) labels to pass through the network policies.

### Monitoring Issues

```bash
# Prometheus not scraping targets
kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring
# Visit http://localhost:9090/targets to see scrape status

# Loki not receiving logs
kubectl logs -n monitoring deployment/alloy-logs --tail=50

# Tempo not receiving traces
kubectl logs -n monitoring deployment/alloy-traces --tail=50
```

### Rolling Update Deadlock with Pending Pods

If old pods are stuck in Pending (e.g., from a previous deployment with higher resource requests), new pods cannot schedule either because the rolling update strategy keeps the old pods alive. This creates a deadlock.

```bash
# Symptom: all pods stuck in Pending, new ReplicaSets can't scale up
kubectl get pods -n <namespace>

# Fix: delete all deployments in the namespace, then re-apply
kubectl delete deployment --all -n <namespace>

# Re-apply the kustomize overlay
kubectl apply -k k8s/overlays/<env>/

# Watch pods come up
kubectl get pods -n <namespace> -w
```

### 3-Environment Resource Sizing

When running dev + staging + prod on the same cluster (4x e2-medium nodes), resource requests must be reduced across all environments to fit. Staging and prod overlays should use dev-level requests (25m CPU). Redis also requires a resource patch (10m CPU / 32Mi memory).

```bash
# Check total resource requests across all namespaces
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Resource Pressure on Nodes

```bash
# Check node resource usage
kubectl top nodes

# Check pod resource usage
kubectl top pods --all-namespaces --sort-by=cpu

# If nodes are under pressure, check if monitoring resource requests are too high
# The install.sh values are pre-tuned for e2-medium (2 vCPU, 4GB RAM)
```

---

## Appendix A: Architecture Overview

```
Internet
    |
    v
[GCP Load Balancer]
    |
    v
[Gateway API (gateway namespace)]
    |
    +---> /              --> frontend (nginx + React SPA)
    +---> /api/products  --> product-service (Spring Boot)
    +---> /api/orders    --> order-service (FastAPI)
    +---> /auth/*        --> product-service (OAuth endpoints)

[Internal]
    product-service ---> Cloud SQL (productdb, private IP)
    order-service   ---> Cloud SQL (orderdb, private IP)
    order-service   ---> Redis (cache-aside)
    order-service   ---> Pub/Sub (order events)
    product-service ---> Pub/Sub (inventory events)

[Observability]
    All services --> Alloy Traces --> Tempo (traces)
    All pods     --> Alloy Logs   --> Loki (logs)
    All services --> Prometheus   --> Grafana (metrics)
```

## Appendix B: Dev Environment Reference

| Resource | Value |
|----------|-------|
| GCP Project | `project-0042e987-ac93-43ec-a4f` |
| Region | `us-east1` |
| Zone | `us-east1-b` |
| Bastion | `cloudmart-bastion-dev` (e2-micro) |
| GKE Cluster | `cloudmart-dev` (3x e2-medium, 50GB SSD; use 4 nodes when running all 3 envs) |
| Cloud SQL | db-f1-micro, private IP via VPC peering |
| Artifact Registry | `us-east1-docker.pkg.dev/project-0042e987-ac93-43ec-a4f/cloudmart-docker` |

## Appendix C: Complete Gotcha Index

For quick scanning, here is every gotcha documented in this guide:

| # | Section | Issue | Fix |
|---|---------|-------|-----|
| 1 | Infrastructure | SSD quota 250GB limit | Set `disk_size_gb = 50` in tfvars |
| 2 | Infrastructure | `us-east1-a` does not exist | Use `us-east1-b` (default) |
| 3 | Bastion | Ansible fails to connect | Update inventory IP from `tofu output` after each recreate |
| 4 | Bastion | `kubectl` times out | Add `--internal-ip` to `get-credentials` |
| 5 | Platform | cert-manager CRDs not installed | Use `crds.enabled=true`, not `installCRDs` |
| 6 | Platform | Monitoring OOM on small nodes | CPU requests pre-tuned for e2-medium |
| 7 | Platform | Grafana password unknown | Default is `prom-operator` unless changed |
| 8 | Platform | Alertmanager missing slack secret | Null receiver configured as default |
| 9 | Build | Frontend env vars not available at runtime | Rebuild with `--build-arg` |
| 10 | Seeding | Network policy blocks seed pods | Add `app: product-service` label |
| 11 | Seeding | `kubectl run -i` fails via SSH tunnel | Use ConfigMap+Job pattern |
| 12 | Seeding | Spring Boot re-runs data.sql | `sql.init.mode: never` in GKE profile |
| 13 | Seeding | Alembic `%` in passwords | Fixed in code -- reads URL from env |
| 14 | OAuth | Google rejects bare IPs | Use nip.io (dashes, not dots) |
| 15 | OAuth | Missing redirect URI | Add to BOTH origins AND redirect URIs |
| 16 | Infrastructure | WIF soft-delete on infra recreate | `gcloud iam workload-identity-pools undelete`, then `tofu import` |
| 17 | Bastion | SA needs `container.admin` for Helm CRDs | Set `roles/container.admin` in IAM module |
| 18 | Platform | `deploy-platform.sh` SIGPIPE exit 141 | Add `\|\| true` to piped commands under `set -euo pipefail` |
| 19 | Platform | `grafana-admin` secret must pre-exist | Create secret in monitoring ns before install |
| 20 | Infrastructure | 3-env cluster needs 4 nodes | Set `node_count = 4`, reduce resource requests to 25m CPU |
| 21 | Deploy | Rolling update deadlock with Pending pods | `kubectl delete deployment --all -n <ns>`, then re-apply |

---

*Last updated: 2026-03-15. Generated from battle-tested deployment of CloudMart v1.0 including full 3-env validation.*
