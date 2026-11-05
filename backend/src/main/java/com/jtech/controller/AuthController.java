package com.jtech.controller;

import com.jtech.dto.request.RefreshTokenRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final com.jtech.security.CookieService cookieService;

    public AuthController(AuthService authService, com.jtech.security.CookieService cookieService) {
        this.authService = authService;
        this.cookieService = cookieService;
    }

    @GetMapping("/account-status")
    public ResponseEntity<java.util.Map<String, String>> accountStatus(HttpServletRequest httpRequest) {
        var session = httpRequest.getSession(false);
        if (session == null) return ResponseEntity.noContent().build();
        Object status = session.getAttribute(com.jtech.security.OAuth2SuccessHandler.ACCOUNT_STATUS_SESSION_KEY);
        if (!(status instanceof String statusValue)) return ResponseEntity.noContent().build();

        java.util.Map<String, String> result = new java.util.HashMap<>();
        result.put("status", statusValue);
        Object reason = session.getAttribute(com.jtech.security.OAuth2SuccessHandler.ACCOUNT_REASON_SESSION_KEY);
        if (reason instanceof String reasonValue) result.put("statusReason", reasonValue);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @RequestBody(required = false) RefreshTokenRequest request,
        @CookieValue(
            value = com.jtech.security.CookieService.REFRESH_TOKEN_COOKIE_NAME,
            required = false
        ) String refreshTokenCookie,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        String refreshToken =
            refreshTokenCookie != null && !refreshTokenCookie.isBlank()
                ? refreshTokenCookie
                : request != null
                  ? request.getRefreshToken()
                  : null;
        authService.logout(refreshToken);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        new SecurityContextLogoutHandler().logout(httpRequest, httpResponse, authentication);
        new CookieClearingLogoutHandler("JSESSIONID").logout(
            httpRequest,
            httpResponse,
            authentication
        );

        ResponseCookie deleteCookie = cookieService.clearRefreshTokenCookie();

        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, deleteCookie.toString())
            .build();
    }

    @PostMapping("/refresh")
    public ResponseEntity<UserResponse> refresh(
        @RequestBody(required = false) RefreshTokenRequest request,
        @CookieValue(
            value = com.jtech.security.CookieService.REFRESH_TOKEN_COOKIE_NAME,
            required = false
        ) String refreshTokenCookie
    ) {
        String refreshToken =
            refreshTokenCookie != null && !refreshTokenCookie.isBlank()
                ? refreshTokenCookie
                : request != null
                  ? request.getRefreshToken()
                  : null;

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }

        UserResponse userResponse = authService.refreshToken(refreshToken);
        userResponse.setRefreshToken(null);
        return ResponseEntity.ok(userResponse);
    }

    @PostMapping("/exchange")
    public ResponseEntity<UserResponse> exchange(
        @RequestBody(required = false) com.jtech.dto.request.ExchangeTokenRequest request,
        @CookieValue(
            value = com.jtech.security.CookieService.AUTH_EXCHANGE_COOKIE_NAME,
            required = false
        ) String cookieCode,
        HttpServletRequest httpRequest,
        HttpServletResponse httpResponse
    ) {
        String code =
            request != null && request.getCode() != null && !request.getCode().isBlank()
                ? request.getCode()
                : cookieCode;

        if ((code == null || code.isBlank()) && httpRequest.getSession(false) != null) {
            Object sessionCode = httpRequest.getSession(false).getAttribute("AUTH_EXCHANGE_CODE");
            if (sessionCode instanceof String sc && !sc.isBlank()) {
                code = sc;
                httpRequest.getSession(false).removeAttribute("AUTH_EXCHANGE_CODE");
            }
        }

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        //
        UserResponse response = authService.exchangeOAuth2Code(code);
        response.setRefreshToken(null);

        ResponseCookie clearCookie = cookieService.clearExchangeCookie();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
            .body(response);
    }
}
