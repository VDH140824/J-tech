package com.jtech.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private final String secret = "jtech-japanese-learning-website-jwt-secret-key-2026-very-secure";
    private final long expirationMs = 1800000; // 30 mins

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(secret, expirationMs);
    }

    @Test
    void testGenerateTokenAndExtractUsername() {
        String email = "testuser@example.com";
        String token = jwtService.generateToken(email);

        assertNotNull(token);
        assertFalse(token.isBlank());

        String extracted = jwtService.extractUsername(token);
        assertEquals(email, extracted);
    }

    @Test
    void testIsTokenValid_Success() {
        String email = "student@jtech.edu.vn";
        String token = jwtService.generateToken(email);

        assertTrue(jwtService.isTokenValid(token, email));
        assertFalse(jwtService.isTokenValid(token, "different@jtech.edu.vn"));
    }

    @Test
    void testIsTokenValid_ExpiredToken() throws InterruptedException {
        // JwtService with 1 ms expiration
        JwtService shortLivedJwtService = new JwtService(secret, 1L);
        String email = "expired@jtech.edu.vn";
        String token = shortLivedJwtService.generateToken(email);

        // Sleep to ensure expiration
        Thread.sleep(50);

        assertFalse(shortLivedJwtService.isTokenValid(token, email));
    }

    @Test
    void testIsTokenValid_InvalidSignature() {
        String email = "user@jtech.edu.vn";
        String token = jwtService.generateToken(email);

        JwtService differentSecretService = new JwtService("another-secret-key-that-is-at-least-256-bits-long-12345678", expirationMs);
        assertFalse(differentSecretService.isTokenValid(token, email));
    }

    @Test
    void testIsTokenValid_MalformedToken() {
        assertFalse(jwtService.isTokenValid("not.a.valid.jwt.token", "user@jtech.edu.vn"));
        assertNull(jwtService.extractUsername("invalid-token"));
    }
}
