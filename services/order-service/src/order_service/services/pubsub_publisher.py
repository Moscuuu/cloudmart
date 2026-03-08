"""Pub/Sub event publisher for order events -- stub for TDD RED phase."""

from google.cloud import pubsub_v1


class PubSubPublisher:
    """Publishes order events to Google Cloud Pub/Sub."""

    def __init__(self, project_id: str) -> None:
        raise NotImplementedError("RED phase stub")

    async def publish_order_placed(self, order_id: str, items: list) -> None:
        raise NotImplementedError("RED phase stub")
