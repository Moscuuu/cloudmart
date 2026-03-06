output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Connection name for Cloud SQL Auth Proxy (project:region:instance)"
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "product_db_name" {
  description = "Name of the product service database"
  value       = google_sql_database.product_db.name
}

output "order_db_name" {
  description = "Name of the order service database"
  value       = google_sql_database.order_db.name
}

output "db_user" {
  description = "Database application username"
  value       = google_sql_user.app_user.name
}

output "db_password" {
  description = "Database application user password"
  value       = random_password.db_password.result
  sensitive   = true
}
