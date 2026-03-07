package com.cloudmart.product.dto;

import java.util.UUID;

public record InventoryResponse(
        UUID productId,
        int quantity,
        int reservedQuantity,
        int availableQuantity
) {
}
