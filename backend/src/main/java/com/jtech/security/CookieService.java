package com.jtech.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class CookieService {

    public static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    public static final String AUTH_EXCHANGE_COOKIE_NAME = "auth_exchange_code";

    private final boolean secure;
    private final String sameSite;
    private final String authPath;

    public CookieService(
            @Value("${app.cookie.secure:false}") boolean secure,
            @Value("${app.cookie.same-site:Lax}") String sameSite,
            @Value("${app.cookie.path:/api/auth}") String authPath) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.authPath = authPath;
    }

    public ResponseCookie createRefreshTokenCookie(String token) {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secure)
                .path(authPath)
                .maxAge(30L * 24 * 60 * 60) // 30 days
                .sameSite(sameSite)
                .build();
    }

    public ResponseCookie clearRefreshTokenCookie() {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .path(authPath)
                .maxAge(0)
                .sameSite(sameSite)
                .build();
    }

    public ResponseCookie createExchangeCookie(String code) {
        return ResponseCookie.from(AUTH_EXCHANGE_COOKIE_NAME, code)
                .httpOnly(true)
                .secure(secure)
                .path(authPath)
                .maxAge(60) // 60 seconds
                .sameSite(sameSite)
                .build();
    }

    public ResponseCookie clearExchangeCookie() {
        return ResponseCookie.from(AUTH_EXCHANGE_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secure)
                .path(authPath)
                .maxAge(0)
                .sameSite(sameSite)
                .build();
    }
}
