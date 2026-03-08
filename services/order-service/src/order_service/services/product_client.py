"""Async HTTP client for Product Service stock validation."""

import asyncio

import httpx
from fastapi import HTTPException

from order_service.schemas.inventory import InventoryResponse
from order_service.schemas.order import OrderItemRequest


class ProductClient:
    """Client for Product Service inventory endpoint."""

    def __init__(self, http_client: httpx.AsyncClient) -> None:
        self.http_client = http_client

    async def check_stock(self, product_id: str) -> InventoryResponse:
        """Check stock for a single product via Product Service."""
        response = await self.http_client.get(
            f"/api/v1/inventory/{product_id}"
        )
        response.raise_for_status()
        return InventoryResponse.model_validate(response.json())

    async def validate_all_stock(
        self, items: list[OrderItemRequest]
    ) -> list[InventoryResponse]:
        """Validate stock for all items concurrently.

        Raises:
            HTTPException 503: If Product Service is unreachable.
            HTTPException 400: If any item has insufficient stock.
        """
        tasks = [self.check_stock(str(item.product_id)) for item in items]

        try:
            results: list[InventoryResponse] = await asyncio.gather(*tasks)
        except (httpx.HTTPError, httpx.ConnectError):
            raise HTTPException(
                status_code=503,
                detail="Product service unavailable, please retry",
            )

        # Check each item against available stock
        insufficient = []
        for item, inventory in zip(items, results):
            if inventory.available_quantity < item.quantity:
                insufficient.append(
                    {
                        "product_id": str(item.product_id),
                        "requested": item.quantity,
                        "available": inventory.available_quantity,
                    }
                )

        if insufficient:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Insufficient stock for one or more items",
                    "items": insufficient,
                },
            )

        return results
