package com.cloudmart.product.service;

import com.cloudmart.product.TestcontainersConfiguration;
import com.cloudmart.product.dto.ProductRequest;
import com.cloudmart.product.dto.ProductResponse;
import com.cloudmart.product.dto.ProductSearchCriteria;
import com.cloudmart.product.exception.DuplicateSkuException;
import com.cloudmart.product.exception.ResourceNotFoundException;
import com.cloudmart.product.model.Category;
import com.cloudmart.product.model.ProductStatus;
import com.cloudmart.product.repository.CategoryRepository;
import com.cloudmart.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class ProductServiceIntegrationTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category testCategory;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        testCategory = categoryRepository.save(new Category("Electronics", "Electronic devices"));
    }

    private ProductRequest createRequest(String name, String sku) {
        return new ProductRequest(name, "A test product", new BigDecimal("99.99"),
                "http://img.example.com/img.jpg", sku, testCategory.getId());
    }

    @Test
    void shouldCreateProductAndReturnResponse() {
        ProductRequest request = createRequest("Gaming Laptop", "LAP-001");

        ProductResponse response = productService.createProduct(request);

        assertThat(response.id()).isNotNull();
        assertThat(response.name()).isEqualTo("Gaming Laptop");
        assertThat(response.sku()).isEqualTo("LAP-001");
        assertThat(response.price()).isEqualByComparingTo(new BigDecimal("99.99"));
        assertThat(response.status()).isEqualTo(ProductStatus.ACTIVE);
        assertThat(response.category()).isNotNull();
        assertThat(response.category().name()).isEqualTo("Electronics");
        assertThat(response.createdAt()).isNotNull();
    }

    @Test
    void shouldThrowDuplicateSkuException() {
        productService.createProduct(createRequest("Product A", "DUP-001"));

        assertThatThrownBy(() -> productService.createProduct(createRequest("Product B", "DUP-001")))
                .isInstanceOf(DuplicateSkuException.class)
                .hasMessageContaining("DUP-001");
    }

    @Test
    void shouldGetProductById() {
        ProductResponse created = productService.createProduct(createRequest("Widget", "WID-001"));

        ProductResponse found = productService.getProduct(created.id());

        assertThat(found.id()).isEqualTo(created.id());
        assertThat(found.name()).isEqualTo("Widget");
        assertThat(found.category().name()).isEqualTo("Electronics");
    }

    @Test
    void shouldThrowResourceNotFoundForInvalidId() {
        UUID randomId = UUID.randomUUID();

        assertThatThrownBy(() -> productService.getProduct(randomId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(randomId.toString());
    }

    @Test
    void shouldUpdateProduct() {
        ProductResponse created = productService.createProduct(createRequest("Old Name", "UPD-001"));
        ProductRequest updateRequest = new ProductRequest("New Name", "Updated desc",
                new BigDecimal("149.99"), null, "UPD-001", testCategory.getId());

        ProductResponse updated = productService.updateProduct(created.id(), updateRequest);

        assertThat(updated.name()).isEqualTo("New Name");
        assertThat(updated.price()).isEqualByComparingTo(new BigDecimal("149.99"));
    }

    @Test
    void shouldDeleteProduct() {
        ProductResponse created = productService.createProduct(createRequest("To Delete", "DEL-001"));

        productService.deleteProduct(created.id());

        assertThatThrownBy(() -> productService.getProduct(created.id()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldSearchProductsByName() {
        productService.createProduct(createRequest("Gaming Laptop", "SRCH-001"));
        productService.createProduct(createRequest("Office Mouse", "SRCH-002"));

        ProductSearchCriteria criteria = new ProductSearchCriteria("laptop", null, null, null);
        Page<ProductResponse> results = productService.searchProducts(criteria,
                PageRequest.of(0, 20, Sort.by("name")));

        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).name()).isEqualTo("Gaming Laptop");
    }

    @Test
    void shouldSearchProductsByPriceRange() {
        productService.createProduct(new ProductRequest("Cheap Item", "A cheap item",
                new BigDecimal("10.00"), null, "PRC-001", testCategory.getId()));
        productService.createProduct(new ProductRequest("Expensive Item", "Costly",
                new BigDecimal("500.00"), null, "PRC-002", testCategory.getId()));

        ProductSearchCriteria criteria = new ProductSearchCriteria(null, null,
                new BigDecimal("100.00"), new BigDecimal("600.00"));
        Page<ProductResponse> results = productService.searchProducts(criteria,
                PageRequest.of(0, 20, Sort.by("name")));

        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).name()).isEqualTo("Expensive Item");
    }
}
