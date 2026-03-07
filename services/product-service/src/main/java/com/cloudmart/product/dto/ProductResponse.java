package com.cloudmart.product.dto;

import com.cloudmart.product.model.ProductStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        String sku,
        ProductStatus status,
        CategoryResponse category,
        Instant createdAt,
        Instant updatedAt
) {
}
