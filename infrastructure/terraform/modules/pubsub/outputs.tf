output "order_placed_topic_name" {
  description = "Name of the order-placed Pub/Sub topic"
  value       = google_pubsub_topic.order_placed.name
}

output "order_placed_topic_id" {
  description = "Full ID of the order-placed Pub/Sub topic"
  value       = google_pubsub_topic.order_placed.id
}

output "product_service_subscription_name" {
  description = "Name of the product-service pull subscription"
  value       = google_pubsub_subscription.order_placed_product_service.name
}
