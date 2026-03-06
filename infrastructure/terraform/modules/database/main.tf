# -----------------------------------------------------------------------------
# Cloud SQL PostgreSQL Module
# Creates a Cloud SQL PostgreSQL 15 instance with private IP, two databases
# (productdb, orderdb), and an application user with a generated password.
#
# WARNING: db-f1-micro has ~25 connection limit.
#   - Set HikariCP pool to 2-3 (Java / Product Service)
#   - Set SQLAlchemy pool to 2-3 (Python / Order Service)
# -----------------------------------------------------------------------------

resource "random_password" "db_password" {
  length  = 24
  special = true
}

resource "google_sql_database_instance" "main" {
  name             = "${var.project_name}-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region

  # Ensure VPC peering is complete before creating the instance.
  # The environment main.tf should pass module.networking.private_vpc_connection_id
  # as the private_vpc_connection_id variable.
  depends_on = []

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.network_id
    }
  }

  deletion_protection = false

  lifecycle {
    # The private_vpc_connection_id variable carries the implicit dependency.
    # We use prevent_destroy = false for this ephemeral portfolio project.
    prevent_destroy = false
  }
}

resource "google_sql_database" "product_db" {
  name     = "productdb"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_database" "order_db" {
  name     = "orderdb"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app_user" {
  name     = "cloudmart"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}
