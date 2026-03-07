package com.cloudmart.product.controller;

import com.cloudmart.product.TestcontainersConfiguration;
import com.cloudmart.product.dto.ProductRequest;
import com.cloudmart.product.dto.ProductResponse;
import com.cloudmart.product.model.Category;
import com.cloudmart.product.repository.CategoryRepository;
import com.cloudmart.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class ProductControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

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
    void shouldListProductsWithPagination() {
        // Create some products
        restTemplate.postForEntity("/api/v1/products", createRequest("Product A", "SKU-A"), ProductResponse.class);
        restTemplate.postForEntity("/api/v1/products", createRequest("Product B", "SKU-B"), ProductResponse.class);
        restTemplate.postForEntity("/api/v1/products", createRequest("Product C", "SKU-C"), ProductResponse.class);

        ResponseEntity<RestPageResponse> response = restTemplate.getForEntity(
                "/api/v1/products?size=2&sort=name,asc", RestPageResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().totalElements()).isEqualTo(3);
        assertThat(response.getBody().totalPages()).isEqualTo(2);
        assertThat(response.getBody().content()).hasSize(2);
    }

    @Test
    void shouldGetProductById() {
        ResponseEntity<ProductResponse> createResponse = restTemplate.postForEntity(
                "/api/v1/products", createRequest("Widget", "WID-001"), ProductResponse.class);
        UUID productId = createResponse.getBody().id();

        ResponseEntity<ProductResponse> response = restTemplate.getForEntity(
                "/api/v1/products/" + productId, ProductResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Widget");
        assertThat(response.getBody().category()).isNotNull();
        assertThat(response.getBody().category().name()).isEqualTo("Electronics");
    }

    @Test
    void shouldReturn404ForNonExistentProduct() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/v1/products/" + UUID.randomUUID(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Resource Not Found");
        assertThat(response.getBody().getStatus()).isEqualTo(404);
    }

    @Test
    void shouldCreateProduct() {
        ProductRequest request = createRequest("Gaming Laptop", "LAP-001");

        ResponseEntity<ProductResponse> response = restTemplate.postForEntity(
                "/api/v1/products", request, ProductResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().id()).isNotNull();
        assertThat(response.getBody().name()).isEqualTo("Gaming Laptop");
        assertThat(response.getBody().sku()).isEqualTo("LAP-001");
        assertThat(response.getBody().price()).isEqualByComparingTo(new BigDecimal("99.99"));
    }

    @Test
    void shouldReturn400ForInvalidProduct() {
        ProductRequest invalid = new ProductRequest("", null, null, null, "", null);

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/v1/products", invalid, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Validation Error");
    }

    @Test
    void shouldReturn409ForDuplicateSku() {
        restTemplate.postForEntity("/api/v1/products", createRequest("First", "DUP-001"), ProductResponse.class);

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/v1/products", createRequest("Second", "DUP-001"), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Duplicate SKU");
    }

    @Test
    void shouldUpdateProduct() {
        ResponseEntity<ProductResponse> createResponse = restTemplate.postForEntity(
                "/api/v1/products", createRequest("Old Name", "UPD-001"), ProductResponse.class);
        UUID productId = createResponse.getBody().id();

        ProductRequest updateRequest = new ProductRequest("New Name", "Updated description",
                new BigDecimal("149.99"), null, "UPD-001", testCategory.getId());
        ResponseEntity<ProductResponse> response = restTemplate.exchange(
                "/api/v1/products/" + productId, HttpMethod.PUT,
                new HttpEntity<>(updateRequest), ProductResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().name()).isEqualTo("New Name");
        assertThat(response.getBody().price()).isEqualByComparingTo(new BigDecimal("149.99"));
    }

    @Test
    void shouldDeleteProduct() {
        ResponseEntity<ProductResponse> createResponse = restTemplate.postForEntity(
                "/api/v1/products", createRequest("To Delete", "DEL-001"), ProductResponse.class);
        UUID productId = createResponse.getBody().id();

        ResponseEntity<Void> deleteResponse = restTemplate.exchange(
                "/api/v1/products/" + productId, HttpMethod.DELETE,
                null, Void.class);

        assertThat(deleteResponse.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        ResponseEntity<ProblemDetail> getResponse = restTemplate.getForEntity(
                "/api/v1/products/" + productId, ProblemDetail.class);
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    /**
     * Helper record to deserialize Spring Data Page responses.
     */
    record RestPageResponse(
            java.util.List<ProductResponse> content,
            int totalPages,
            long totalElements,
            int size,
            int number
    ) {
    }
}
