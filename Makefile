.DEFAULT_GOAL := help

# ---------------------------------------------------------------------------
# Development
# ---------------------------------------------------------------------------

.PHONY: dev-up
dev-up: ## Start local development services via Docker Compose
	docker compose up -d

.PHONY: dev-down
dev-down: ## Stop local development services and remove volumes
	docker compose down -v

# ---------------------------------------------------------------------------
# Testing
# ---------------------------------------------------------------------------

.PHONY: test-product
test-product: ## Run Product Service tests (requires JAVA_HOME)
	cd services/product-service && ./mvnw test

.PHONY: test-order
test-order: ## Run Order Service tests
	cd services/order-service && uv run pytest

.PHONY: test-frontend
test-frontend: ## Run Frontend tests
	cd services/frontend && pnpm test

.PHONY: test-all
test-all: test-product test-order test-frontend ## Run all service tests

# ---------------------------------------------------------------------------
# Linting
# ---------------------------------------------------------------------------

.PHONY: lint
lint: ## Run linters for Order Service and Frontend
	cd services/order-service && uv run ruff check src tests
	cd services/frontend && pnpm lint

# ---------------------------------------------------------------------------
# Docker Builds
# ---------------------------------------------------------------------------

.PHONY: build-product
build-product: ## Build Product Service Docker image
	cd services/product-service && docker build -t product-service .

.PHONY: build-order
build-order: ## Build Order Service Docker image
	cd services/order-service && docker build -t order-service .

.PHONY: build-frontend
build-frontend: ## Build Frontend Docker image
	cd services/frontend && docker build -t frontend .

.PHONY: build-all
build-all: build-product build-order build-frontend ## Build all Docker images

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
