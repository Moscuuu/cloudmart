# -----------------------------------------------------------------------------
# Pub/Sub Module
# Creates the order-placed topic and product-service pull subscription
# for async communication between Order Service and Product Service.
# -----------------------------------------------------------------------------

resource "google_pubsub_topic" "order_placed" {
  name                       = "order-placed"
  message_retention_duration = "86400s" # 24 hours

  labels = {
    environment = var.environment
  }
}

resource "google_pubsub_subscription" "order_placed_product_service" {
  name  = "order-placed-product-service"
  topic = google_pubsub_topic.order_placed.name

  ack_deadline_seconds = 20

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  labels = {
    environment = var.environment
    service     = "product-service"
  }
}
