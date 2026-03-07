package com.cloudmart.product.service;

import com.cloudmart.product.dto.CategoryResponse;
import com.cloudmart.product.dto.ProductRequest;
import com.cloudmart.product.dto.ProductResponse;
import com.cloudmart.product.dto.ProductSearchCriteria;
import com.cloudmart.product.exception.DuplicateSkuException;
import com.cloudmart.product.exception.ResourceNotFoundException;
import com.cloudmart.product.model.Category;
import com.cloudmart.product.model.Product;
import com.cloudmart.product.repository.CategoryRepository;
import com.cloudmart.product.repository.ProductRepository;
import com.cloudmart.product.specification.ProductSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository,
                          CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    public Page<ProductResponse> searchProducts(ProductSearchCriteria criteria, Pageable pageable) {
        Specification<Product> spec = ProductSpecifications.withSearchCriteria(criteria);
        return productRepository.findAll(spec, pageable).map(this::toResponse);
    }

    public ProductResponse getProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        return toResponse(product);
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        productRepository.findBySku(request.sku())
                .ifPresent(existing -> {
                    throw new DuplicateSkuException(request.sku());
                });

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", request.categoryId()));

        Product product = new Product();
        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setImageUrl(request.imageUrl());
        product.setSku(request.sku());
        product.setCategory(category);

        Product saved = productRepository.save(product);
        return toResponse(saved);
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));

        productRepository.findBySku(request.sku())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new DuplicateSkuException(request.sku());
                });

        Category category = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", request.categoryId()));

        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setImageUrl(request.imageUrl());
        product.setSku(request.sku());
        product.setCategory(category);

        Product saved = productRepository.save(product);
        return toResponse(saved);
    }

    @Transactional
    public void deleteProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", id));
        productRepository.delete(product);
    }

    private ProductResponse toResponse(Product product) {
        CategoryResponse categoryResponse = null;
        Category category = product.getCategory();
        if (category != null) {
            categoryResponse = new CategoryResponse(
                    category.getId(),
                    category.getName(),
                    category.getDescription()
            );
        }
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getImageUrl(),
                product.getSku(),
                product.getStatus(),
                categoryResponse,
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
