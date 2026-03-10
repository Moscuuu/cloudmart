"""Pydantic schemas for inventory responses from Product Service."""

from pydantic import BaseModel, ConfigDict, Field


class InventoryResponse(BaseModel):
    """Response schema from Product Service inventory endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    product_id: str = Field(alias="productId")
    quantity: int
    reserved_quantity: int = Field(alias="reservedQuantity")
    available_quantity: int = Field(alias="availableQuantity")
