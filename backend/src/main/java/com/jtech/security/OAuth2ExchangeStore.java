package com.jtech.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class OAuth2ExchangeStore {

    public static class ExchangePayload {
        private final Long userId;
        private final String accessToken;
        private final String refreshToken;
        private final Instant expiresAt;
        private Instant consumedAt;

        public ExchangePayload(Long userId, String accessToken, String refreshToken, Instant expiresAt) {
            this.userId = userId;
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.expiresAt = expiresAt;
            this.consumedAt = null;
        }

        public Long getUserId() {
            return userId;
        }

        public String getAccessToken() {
            return accessToken;
        }

        public String getRefreshToken() {
            return refreshToken;
        }

        public Instant getExpiresAt() {
            return expiresAt;
        }

        public Instant getConsumedAt() {
            return consumedAt;
        }

        public void setConsumedAt(Instant consumedAt) {
            this.consumedAt = consumedAt;
        }
    }

    private final Map<String, ExchangePayload> store = new ConcurrentHashMap<>();

    public String createExchangeCode(Long userId, String accessToken, String refreshToken) {
        cleanupExpired();
        String code = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(60);
        store.put(code, new ExchangePayload(userId, accessToken, refreshToken, expiresAt));
        return code;
    }

    public ExchangePayload consume(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        cleanupExpired();
        ExchangePayload payload = store.get(code);
        if (payload == null) {
            return null;
        }
        Instant now = Instant.now();
        if (payload.getExpiresAt().isBefore(now)) {
            store.remove(code);
            return null;
        }

        // If already consumed, only allow if within 5-second grace window (e.g. React StrictMode duplicate request)
        if (payload.getConsumedAt() != null) {
            if (payload.getConsumedAt().plusSeconds(5).isBefore(now)) {
                store.remove(code);
                return null;
            }
            return payload;
        }

        payload.setConsumedAt(now);
        return payload;
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        store.entrySet().removeIf(entry -> {
            ExchangePayload p = entry.getValue();
            return p.getExpiresAt().isBefore(now)
                    || (p.getConsumedAt() != null && p.getConsumedAt().plusSeconds(10).isBefore(now));
        });
    }
}
