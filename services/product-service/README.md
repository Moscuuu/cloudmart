# Product Service

Java 21 / Spring Boot 3.4 REST API for product catalog management and inventory tracking.

## Tech Stack

| Technology | Purpose |
|---|---|
| Java 21 | Language runtime |
| Spring Boot 3.4.3 | Application framework |
| Spring Data JPA | Database access and ORM |
| PostgreSQL | Relational database (Cloud SQL) |
| Google Pub/Sub | Async event messaging (inventory updates) |
| Micrometer / Prometheus | Metrics export |
| OpenTelemetry (Java Agent) | Distributed tracing |
| Testcontainers | Integration testing with real PostgreSQL |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products with filtering, search, pagination |
| GET | `/api/products/{id}` | Get product by ID |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/{id}` | Update an existing product |
| DELETE | `/api/products/{id}` | Soft-delete a product |
| GET | `/api/products/{id}/stock` | Get current stock level |

Products support filtering by category, price range, and text search via JPA Specification queries.

## Running Locally

Requires a PostgreSQL instance (or use Docker Compose from the repository root).

```bash
./mvnw spring-boot:run
```

The service starts on port 8080 by default.

## Running Tests

Tests use Testcontainers to spin up a real PostgreSQL instance automatically. Docker must be running.

```bash
./mvnw test
```

## Building Docker Image

```bash
docker build -t product-service .
```

The Dockerfile uses a multi-stage build with dependency caching for faster rebuilds.

## Configuration

Key configuration properties (set via environment variables or `application.yml`):

| Variable | Description | Default |
|---|---|---|
| `SPRING_DATASOURCE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/productdb` |
| `SPRING_DATASOURCE_USERNAME` | Database username | `cloudmart` |
| `SPRING_DATASOURCE_PASSWORD` | Database password | - |
| `OTEL_SERVICE_NAME` | OpenTelemetry service identifier | `product-service` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector endpoint | - |

## Key Design Decisions

- **Inventory decoupled from Product** via UUID FK column for Pub/Sub listener simplicity
- **JPA Specification pattern** for composable, dynamic search queries
- **Java records** for all DTOs (immutable, no Lombok dependency)
- **OTel Java Agent** injected via `JAVA_TOOL_OPTIONS` environment variable
- **Graceful stock handling**: `decrementStock` returns false on insufficient stock (no exceptions)
