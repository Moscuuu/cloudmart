package com.cloudmart.product.controller;

import com.cloudmart.product.TestcontainersConfiguration;
import com.cloudmart.product.TestJwtHelper;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class ProductSearchIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category electronics;
    private Category clothing;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        electronics = categoryRepository.save(new Category("Computers", "Computer hardware"));
        clothing = categoryRepository.save(new Category("Clothing", "Apparel and garments"));

        // Seed products (as admin)
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(TestJwtHelper.adminJwt());
        headers.setContentType(MediaType.APPLICATION_JSON);

        restTemplate.exchange("/api/v1/products", HttpMethod.POST,
                new HttpEntity<>(new ProductRequest("Gaming Laptop", "High-end gaming laptop", new BigDecimal("1500.00"),
                        null, "COMP-001", electronics.getId()), headers), ProductResponse.class);
        restTemplate.exchange("/api/v1/products", HttpMethod.POST,
                new HttpEntity<>(new ProductRequest("Office Laptop", "Business laptop for office use", new BigDecimal("800.00"),
                        null, "COMP-002", electronics.getId()), headers), ProductResponse.class);
        restTemplate.exchange("/api/v1/products", HttpMethod.POST,
                new HttpEntity<>(new ProductRequest("Cotton T-Shirt", "Comfortable cotton t-shirt", new BigDecimal("25.00"),
                        null, "CLO-001", clothing.getId()), headers), ProductResponse.class);
        restTemplate.exchange("/api/v1/products", HttpMethod.POST,
                new HttpEntity<>(new ProductRequest("Winter Jacket", "Warm winter jacket", new BigDecimal("120.00"),
                        null, "CLO-002", clothing.getId()), headers), ProductResponse.class);
    }

    @Test
    void shouldSearchByNameOrDescription() {
        ResponseEntity<SearchPageResponse> response = restTemplate.getForEntity(
                "/api/v1/products?search=laptop", SearchPageResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).hasSize(2);
        assertThat(response.getBody().content())
                .extracting(ProductResponse::name)
                .containsExactlyInAnyOrder("Gaming Laptop", "Office Laptop");
    }

    @Test
    void shouldFilterByCategory() {
        ResponseEntity<SearchPageResponse> response = restTemplate.getForEntity(
                "/api/v1/products?category=computers", SearchPageResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).hasSize(2);
        assertThat(response.getBody().content())
                .extracting(ProductResponse::name)
                .containsExactlyInAnyOrder("Gaming Laptop", "Office Laptop");
    }

    @Test
    void shouldFilterByPriceRange() {
        ResponseEntity<SearchPageResponse> response = restTemplate.getForEntity(
                "/api/v1/products?minPrice=100&maxPrice=1000", SearchPageResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).hasSize(2);
        assertThat(response.getBody().content())
                .extracting(ProductResponse::name)
                .containsExactlyInAnyOrder("Office Laptop", "Winter Jacket");
    }

    @Test
    void shouldCombineFilters() {
        ResponseEntity<SearchPageResponse> response = restTemplate.getForEntity(
                "/api/v1/products?search=laptop&category=computers&minPrice=1000&maxPrice=2000",
                SearchPageResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).hasSize(1);
        assertThat(response.getBody().content().get(0).name()).isEqualTo("Gaming Laptop");
    }

    @Test
    void shouldReturnEmptyPageForNoMatches() {
        ResponseEntity<SearchPageResponse> response = restTemplate.getForEntity(
                "/api/v1/products?search=nonexistent", SearchPageResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().content()).isEmpty();
        assertThat(response.getBody().totalElements()).isEqualTo(0);
    }

    record SearchPageResponse(
            List<ProductResponse> content,
            int totalPages,
            long totalElements,
            int size,
            int number
    ) {
    }
}
