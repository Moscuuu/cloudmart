package com.cloudmart.product;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

/**
 * Shared JWT helper for integration tests that need authenticated HTTP requests.
 * Uses the same HS256 secret defined in application-test.yml.
 */
public final class TestJwtHelper {

    private static final String TEST_SECRET = "test-secret-key-for-unit-tests-min-32-bytes!!";

    private TestJwtHelper() {
    }

    public static String adminJwt() {
        return createJwt("google-oauth2|test-admin", "admin");
    }

    public static String userJwt() {
        return createJwt("google-oauth2|test-user", "user");
    }

    public static String createJwt(String sub, String role) {
        try {
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
        } catch (Exception e) {
            throw new RuntimeException("Failed to create test JWT", e);
        }
    }
}
