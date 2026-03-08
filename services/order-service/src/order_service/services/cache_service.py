"""Redis cache service for product availability -- stub for TDD RED phase."""


class CacheService:
    """Cache-aside pattern for product availability data."""

    def __init__(self, redis_client, product_client) -> None:
        raise NotImplementedError("RED phase stub")

    async def get_availability(self, product_id: str) -> dict:
        raise NotImplementedError("RED phase stub")
