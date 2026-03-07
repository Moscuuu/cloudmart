package com.cloudmart.product.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.cloudmart.product.TestcontainersConfiguration;
import com.cloudmart.product.dto.InventoryResponse;
import com.cloudmart.product.model.Category;
import com.cloudmart.product.model.Inventory;
import com.cloudmart.product.model.Product;
import com.cloudmart.product.model.ProductStatus;
import com.cloudmart.product.repository.CategoryRepository;
import com.cloudmart.product.repository.InventoryRepository;
import com.cloudmart.product.repository.ProductRepository;
import com.cloudmart.product.service.InventoryService;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class InventoryControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private InventoryService inventoryService;

    private UUID testProductId;

    @BeforeEach
    void setUp() {
        inventoryRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        Category category = new Category("Electronics", "Electronic devices");
        category = categoryRepository.save(category);

        Product product = new Product();
        product.setName("Test Product");
        product.setDescription("A test product");
        product.setPrice(new BigDecimal("29.99"));
        product.setSku("TEST-SKU-001");
        product.setStatus(ProductStatus.ACTIVE);
        product.setCategory(category);
        product = productRepository.save(product);
        testProductId = product.getId();

        Inventory inventory = new Inventory(testProductId, 100);
        inventoryRepository.save(inventory);
    }

    @Test
    void shouldReturnInventoryForProduct() {
        ResponseEntity<InventoryResponse> response = restTemplate.getForEntity(
                "/api/v1/inventory/{productId}", InventoryResponse.class, testProductId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().productId()).isEqualTo(testProductId);
        assertThat(response.getBody().quantity()).isEqualTo(100);
        assertThat(response.getBody().reservedQuantity()).isEqualTo(0);
        assertThat(response.getBody().availableQuantity()).isEqualTo(100);
    }

    @Test
    void shouldReturn404ForUnknownProduct() {
        UUID unknownId = UUID.randomUUID();

        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/v1/inventory/{productId}", ProblemDetail.class, unknownId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Resource Not Found");
    }

    @Test
    void shouldDecrementStock() {
        boolean result = inventoryService.decrementStock(testProductId, 10);
        assertThat(result).isTrue();

        ResponseEntity<InventoryResponse> response = restTemplate.getForEntity(
                "/api/v1/inventory/{productId}", InventoryResponse.class, testProductId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().quantity()).isEqualTo(90);
        assertThat(response.getBody().availableQuantity()).isEqualTo(90);
    }

    @Test
    void shouldReturnFalseForInsufficientStock() {
        boolean result = inventoryService.decrementStock(testProductId, 200);
        assertThat(result).isFalse();

        // Verify quantity unchanged
        ResponseEntity<InventoryResponse> response = restTemplate.getForEntity(
                "/api/v1/inventory/{productId}", InventoryResponse.class, testProductId);

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().quantity()).isEqualTo(100);
    }
}
