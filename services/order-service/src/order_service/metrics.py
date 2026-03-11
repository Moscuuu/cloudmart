"""Prometheus business metrics for Order Service."""

from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST

ORDERS_CREATED = Counter(
    "orders_created_total",
    "Total orders created",
    ["status"],
)

PRODUCTS_VIEWED = Counter(
    "products_viewed_total",
    "Total product availability checks",
)

REVENUE_GAUGE = Gauge(
    "simulated_revenue_dollars",
    "Simulated total revenue in dollars",
)

__all__ = [
    "ORDERS_CREATED",
    "PRODUCTS_VIEWED",
    "REVENUE_GAUGE",
    "generate_latest",
    "CONTENT_TYPE_LATEST",
]
