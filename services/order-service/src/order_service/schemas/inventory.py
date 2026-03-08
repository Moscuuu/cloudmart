"""Pydantic schemas for inventory responses from Product Service."""

from pydantic import BaseModel


class InventoryResponse(BaseModel):
    """Response schema from Product Service inventory endpoint."""

    product_id: str
    quantity: int
    reserved_quantity: int
    available_quantity: int
