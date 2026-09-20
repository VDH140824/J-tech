package com.jtech.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secret;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret:change-me-secret-change-me-secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.secret = secret;
        this.expirationMs = expirationMs;
    }

    public String generateToken(String username) {
        long issuedAt = System.currentTimeMillis();
        long expiresAt = issuedAt + expirationMs;
        String header = base64Url("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = base64Url(
                "{\"sub\":\"" + escapeJson(username) + "\",\"iat\":" + issuedAt + ",\"exp\":" + expiresAt + "}");
        String signature = sign(header + "." + payload);
        return header + "." + payload + "." + signature;
    }

    public String extractUsername(String token) {
        String[] parts = splitToken(token);
        String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        return readJsonStringValue(payloadJson, "sub");
    }

    public boolean isTokenValid(String token, String username) {
        try {
            String[] parts = splitToken(token);
            String signedContent = parts[0] + "." + parts[1];
            String expectedSignature = sign(signedContent);
            if (!MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    parts[2].getBytes(StandardCharsets.UTF_8))) {
                return false;
            }

            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            String subject = readJsonStringValue(payloadJson, "sub");
            long exp = readJsonLongValue(payloadJson, "exp");
            return username.equals(subject) && new Date().getTime() < exp;
        } catch (Exception ex) {
            return false;
        }
    }

    private String sign(String content) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] rawSignature = mac.doFinal(content.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawSignature);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign token", ex);
        }
    }

    private String[] splitToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid token");
        }
        return parts;
    }

    private String base64Url(String value) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String readJsonStringValue(String json, String key) {
        String token = "\"" + key + "\":\"";
        int start = json.indexOf(token);
        if (start < 0) {
            return null;
        }
        start += token.length();
        int end = json.indexOf("\"", start);
        return end < 0 ? null : json.substring(start, end);
    }

    private long readJsonLongValue(String json, String key) {
        String token = "\"" + key + "\":";
        int start = json.indexOf(token);
        if (start < 0) {
            return 0L;
        }
        start += token.length();
        int end = start;
        while (end < json.length() && Character.isDigit(json.charAt(end))) {
            end++;
        }
        return Long.parseLong(json.substring(start, end));
    }
}
