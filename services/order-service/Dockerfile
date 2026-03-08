# Stage 1: Builder - install dependencies with uv
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install production dependencies only (skip project itself for caching)
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source and migration files
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .

# Now install the project itself (picks up src/order_service)
RUN uv sync --frozen --no-dev

# Stage 2: Runtime - minimal image
FROM python:3.12-slim

WORKDIR /app

# Copy virtualenv and application from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/alembic /app/alembic
COPY --from=builder /app/alembic.ini .

# Add virtualenv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# OpenTelemetry configuration
ENV OTEL_SERVICE_NAME="order-service"
ENV OTEL_METRICS_EXPORTER="none"
ENV OTEL_TRACES_EXPORTER="otlp"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

EXPOSE 8000

# Run via opentelemetry-instrument for auto-instrumentation
CMD ["opentelemetry-instrument", "uvicorn", "order_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
