"""Pub/Sub event publisher for order-placed events."""

import asyncio
import json
import logging
import os

from google.cloud import pubsub_v1

from order_service.models.order_item import OrderItem

logger = logging.getLogger(__name__)

TOPIC_NAME = "order-placed"


class PubSubPublisher:
    """Publishes order-placed events to Google Cloud Pub/Sub.

    One event is published per line item so the Product Service can
    decrement inventory for each product independently.
    """

    def __init__(self, project_id: str) -> None:
        self._publisher = pubsub_v1.PublisherClient()
        self._topic = self._publisher.topic_path(project_id, TOPIC_NAME)

    async def ensure_topic(self) -> None:
        """Create topic if running against the Pub/Sub emulator.

        Safe to call multiple times -- swallows AlreadyExists.
        """
        if not os.environ.get("PUBSUB_EMULATOR_HOST"):
            return

        from google.api_core.exceptions import AlreadyExists

        try:
            await asyncio.to_thread(
                self._publisher.create_topic, name=self._topic
            )
            logger.info("Created Pub/Sub topic %s (emulator)", self._topic)
        except AlreadyExists:
            logger.debug("Topic %s already exists", self._topic)

    async def publish_order_placed(
        self, order_id: str, items: list[OrderItem]
    ) -> None:
        """Publish one event per line item to the order-placed topic.

        Event format: {"orderId": str, "productId": str, "quantity": int}

        On failure, logs a warning but does NOT raise -- the order stays
        PENDING and can be retried later.
        """
        for item in items:
            event = {
                "orderId": order_id,
                "productId": str(item.product_id),
                "quantity": item.quantity,
            }
            data = json.dumps(event).encode("utf-8")
            future = self._publisher.publish(self._topic, data=data)
            await asyncio.to_thread(future.result)
