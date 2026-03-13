# Stage 1: Build
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Copy POM for dependency caching
COPY pom.xml .

RUN mvn dependency:go-offline -B

# Copy source and build
COPY src/ src/

RUN mvn package -DskipTests -B

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# OpenTelemetry Java agent for distributed tracing
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.12.0/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar

# Copy application JAR from builder
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

# OTel agent configured via JAVA_TOOL_OPTIONS (cleaner than modifying ENTRYPOINT)
ENV JAVA_TOOL_OPTIONS="-javaagent:/app/opentelemetry-javaagent.jar"
ENV OTEL_SERVICE_NAME="product-service"
ENV OTEL_METRICS_EXPORTER="none"
ENV OTEL_TRACES_EXPORTER="otlp"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

ENTRYPOINT ["java", "-jar", "app.jar"]
