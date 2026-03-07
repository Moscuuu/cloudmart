package com.cloudmart.product.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank String name,
        @Size(max = 2000) String description,
        @NotNull @Positive BigDecimal price,
        String imageUrl,
        @NotBlank @Size(max = 50) String sku,
        @NotNull Long categoryId
) {
}
