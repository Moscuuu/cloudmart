package com.cloudmart.product.dto;

import java.math.BigDecimal;

public record ProductSearchCriteria(
        String search,
        String category,
        BigDecimal minPrice,
        BigDecimal maxPrice
) {
}
