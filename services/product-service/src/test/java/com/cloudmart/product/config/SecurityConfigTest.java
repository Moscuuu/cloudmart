package com.cloudmart.product.config;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.cloudmart.product.TestcontainersConfiguration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class SecurityConfigTest {

    private static final String TEST_SECRET = "test-secret-key-for-unit-tests-min-32-bytes!!";

    @Autowired
    private MockMvc mockMvc;

    private String createTestJwt(String sub, String role) throws Exception {
        JWSSigner signer = new MACSigner(
                TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(sub)
                .claim("email", "test@example.com")
                .claim("name", "Test User")
                .claim("role", role)
                .issueTime(new Date())
                .expirationTime(new Date(System.currentTimeMillis() + 900_000))
                .jwtID(UUID.randomUUID().toString())
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(signer);
        return jwt.serialize();
    }

    @Test
    void testGetProductsPublic() throws Exception {
        mockMvc.perform(get("/api/v1/products"))
                .andExpect(status().isOk());
    }

    @Test
    void testGetProductByIdPublic() throws Exception {
        // Non-existent ID returns 404, but NOT 401/403 - proving auth is not required
        mockMvc.perform(get("/api/v1/products/{id}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetInventoryPublic() throws Exception {
        // Non-existent product returns 404, but NOT 401/403
        mockMvc.perform(get("/api/v1/inventory/{productId}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetActuatorPublic() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk());
    }

    @Test
    void testPostProductRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Test Product",
                                    "description": "A test product",
                                    "sku": "TEST-SEC-001",
                                    "price": 9.99,
                                    "categoryId": 1
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testPostProductRequiresAdmin() throws Exception {
        String userJwt = createTestJwt("google-oauth2|user123", "user");
        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Test Product",
                                    "description": "A test product",
                                    "sku": "TEST-SEC-002",
                                    "price": 9.99,
                                    "categoryId": 1
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void testPostProductWithAdmin() throws Exception {
        String adminJwt = createTestJwt("google-oauth2|admin123", "admin");
        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Security Test Product",
                                    "description": "Created by admin",
                                    "sku": "TEST-SEC-ADMIN-001",
                                    "price": 29.99,
                                    "categoryId": 1
                                }
                                """))
                .andExpect(status().isCreated());
    }

    @Test
    void testPutProductRequiresAdmin() throws Exception {
        String userJwt = createTestJwt("google-oauth2|user456", "user");
        mockMvc.perform(put("/api/v1/products/{id}", UUID.randomUUID())
                        .header("Authorization", "Bearer " + userJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                    "name": "Updated Product",
                                    "description": "Should be forbidden",
                                    "sku": "TEST-SEC-003",
                                    "price": 19.99,
                                    "categoryId": 1
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void testDeleteProductRequiresAuth() throws Exception {
        mockMvc.perform(delete("/api/v1/products/{id}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }
}
