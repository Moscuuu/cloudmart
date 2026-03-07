package com.cloudmart.product.specification;

import com.cloudmart.product.dto.ProductSearchCriteria;
import com.cloudmart.product.model.Product;
import com.cloudmart.product.model.ProductStatus;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public final class ProductSpecifications {

    private ProductSpecifications() {
    }

    public static Specification<Product> withSearchCriteria(ProductSearchCriteria criteria) {
        return Specification.where(hasStatus(ProductStatus.ACTIVE))
                .and(nameOrDescriptionContains(criteria.search()))
                .and(hasCategory(criteria.category()))
                .and(priceGreaterThanOrEqual(criteria.minPrice()))
                .and(priceLessThanOrEqual(criteria.maxPrice()));
    }

    private static Specification<Product> hasStatus(ProductStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    private static Specification<Product> nameOrDescriptionContains(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String pattern = "%" + search.toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern),
                cb.like(cb.lower(root.get("description")), pattern)
        );
    }

    private static Specification<Product> hasCategory(String category) {
        if (category == null || category.isBlank()) {
            return null;
        }
        return (root, query, cb) -> {
            var join = root.join("category", JoinType.INNER);
            return cb.equal(cb.lower(join.get("name")), category.toLowerCase());
        };
    }

    private static Specification<Product> priceGreaterThanOrEqual(java.math.BigDecimal minPrice) {
        if (minPrice == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    private static Specification<Product> priceLessThanOrEqual(java.math.BigDecimal maxPrice) {
        if (maxPrice == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice);
    }
}
