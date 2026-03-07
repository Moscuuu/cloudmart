package com.cloudmart.product.dto;

import java.util.UUID;

public record OrderPlacedEvent(
        String orderId,
        UUID productId,
        int quantity
) {
}
