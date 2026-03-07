package com.cloudmart.product;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class ProductServiceApplicationTests {

    @Test
    void contextLoads() {
        // Verifies Spring context starts successfully with:
        // - Testcontainers PostgreSQL
        // - JPA entity mapping validation
        // - Seed data loading from data.sql
    }
}
