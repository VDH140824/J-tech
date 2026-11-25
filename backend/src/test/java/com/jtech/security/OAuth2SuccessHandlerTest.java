package com.jtech.security;

import static com.jtech.security.OAuth2SuccessHandler.ACCOUNT_REASON_SESSION_KEY;
import static com.jtech.security.OAuth2SuccessHandler.ACCOUNT_STATUS_SESSION_KEY;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.jtech.entity.RefreshToken;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.RefreshTokenRepository;
import com.jtech.repository.RoleRepository;
import com.jtech.repository.UserRepository;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;

@ExtendWith(MockitoExtension.class)
class OAuth2SuccessHandlerTest {

    private static final String FRONTEND_URL = "http://localhost:5173";
    private static final String EMAIL = "student@example.test";
    private static final long USER_ID = 10L;

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private JwtService jwtService;
    @Mock private OAuth2ExchangeStore exchangeStore;
    @Mock private CookieService cookieService;
    @Mock private OAuth2AuthenticationToken authentication;
    @Mock private OAuth2User googleUser;

    private final Role studentRole = Role.builder().roleName("STUDENT").build();
    private final MockHttpServletRequest request = new MockHttpServletRequest();
    private final MockHttpServletResponse response = new MockHttpServletResponse();
    private OAuth2SuccessHandler handler;

    @BeforeEach
    void setUp() {
        handler = new OAuth2SuccessHandler(
            userRepository, roleRepository, refreshTokenRepository, jwtService, exchangeStore,
            cookieService, FRONTEND_URL
        );
        when(authentication.getPrincipal()).thenReturn(googleUser);
    }

    @Test
    @DisplayName("UTCID01 - Active student receives login credentials")
    void activeUserLoginSuccess() throws IOException, ServletException {
        User user = givenExistingUser(UserStatus.ACTIVE, null);
        String accessToken = "access-token";
        String exchangeCode = "exchange-code";
        ResponseCookie exchangeCookie = ResponseCookie.from(
            CookieService.AUTH_EXCHANGE_COOKIE_NAME, exchangeCode
        ).build();
        when(refreshTokenRepository.save(any(RefreshToken.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(EMAIL)).thenReturn(accessToken);
        when(exchangeStore.createExchangeCode(eq(USER_ID), eq(accessToken), anyString()))
            .thenReturn(exchangeCode);
        when(cookieService.createRefreshTokenCookie(anyString())).thenAnswer(invocation ->
            ResponseCookie.from(
                CookieService.REFRESH_TOKEN_COOKIE_NAME, invocation.getArgument(0, String.class)
            ).build()
        );
        when(cookieService.createExchangeCookie(exchangeCode)).thenReturn(exchangeCookie);

        logInWithEmail(EMAIL);

        ArgumentCaptor<RefreshToken> savedToken = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(savedToken.capture());
        RefreshToken refreshToken = savedToken.getValue();
        assertSame(user, refreshToken.getUser());
        assertDoesNotThrow(() -> UUID.fromString(refreshToken.getToken()));
        assertNotNull(refreshToken.getExpiresAt());
        assertEquals(Boolean.FALSE, refreshToken.getRevoked());
        verify(jwtService).generateToken(EMAIL);
        verify(exchangeStore).createExchangeCode(USER_ID, accessToken, refreshToken.getToken());
        verify(cookieService).createRefreshTokenCookie(refreshToken.getToken());
        verify(cookieService).createExchangeCookie(exchangeCode);
        ResponseCookie expectedRefreshCookie = ResponseCookie.from(
            CookieService.REFRESH_TOKEN_COOKIE_NAME, refreshToken.getToken()
        ).build();
        assertEquals(
            List.of(expectedRefreshCookie.toString(), exchangeCookie.toString()),
            response.getHeaders(HttpHeaders.SET_COOKIE)
        );
        assertEquals(FRONTEND_URL + "/oauth2/redirect", response.getRedirectedUrl());
    }

    @Test
    @DisplayName("UTCID02 - First Google login creates a pending student")
    void newUserCreatedAsPending() throws IOException, ServletException {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
        when(roleRepository.findByRoleName("STUDENT")).thenReturn(Optional.of(studentRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        logInWithEmail(EMAIL);

        verify(userRepository).findByEmail(EMAIL);
        verify(roleRepository).findByRoleName("STUDENT");
        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        User newUser = savedUser.getValue();
        assertEquals(EMAIL, newUser.getEmail());
        assertEquals("STUDENT", newUser.getRole().getRoleName());
        assertEquals(UserStatus.PENDING, newUser.getStatus());
        assertEquals(0, newUser.getCoinBalance());
        assertEquals(FRONTEND_URL + "/pending-approval", response.getRedirectedUrl());
        assertNoCredentialsIssued();
    }

    @Test
    @DisplayName("UTCID03 - Pending account is redirected to approval")
    void pendingUserRedirected() throws IOException, ServletException {
        givenExistingUser(UserStatus.PENDING, null);
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);

        logInWithEmail(EMAIL);

        assertEquals("PENDING", session.getAttribute(ACCOUNT_STATUS_SESSION_KEY));
        assertEquals(FRONTEND_URL + "/pending-approval", response.getRedirectedUrl());
        assertNoCredentialsIssued();
    }

    @Test
    @DisplayName("UTCID04 - Rejected account status and reason are stored")
    void rejectedUserRedirected() throws IOException, ServletException {
        String reason = "Registration was rejected";
        givenExistingUser(UserStatus.REJECTED, reason);
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);

        logInWithEmail(EMAIL);

        assertEquals("REJECTED", session.getAttribute(ACCOUNT_STATUS_SESSION_KEY));
        assertEquals(reason, session.getAttribute(ACCOUNT_REASON_SESSION_KEY));
        assertEquals(FRONTEND_URL + "/account-rejected", response.getRedirectedUrl());
        assertNoCredentialsIssued();
    }

    @Test
    @DisplayName("UTCID05 - Locked account status and reason are stored")
    void lockedUserRedirected() throws IOException, ServletException {
        String reason = "Account was locked";
        givenExistingUser(UserStatus.LOCKED, reason);
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);

        logInWithEmail(EMAIL);

        assertEquals("LOCKED", session.getAttribute(ACCOUNT_STATUS_SESSION_KEY));
        assertEquals(reason, session.getAttribute(ACCOUNT_REASON_SESSION_KEY));
        assertEquals(FRONTEND_URL + "/account-rejected", response.getRedirectedUrl());
        assertNoCredentialsIssued();
    }

    @Test
    @DisplayName("UTCID06 - Null Google email is rejected")
    void nullEmailRejected() throws IOException, ServletException {
        logInWithEmail(null);

        assertEmailRejected();
    }

    @Test
    @DisplayName("UTCID07 - Empty Google email is rejected")
    void emptyEmailRejected() throws IOException, ServletException {
        logInWithEmail("");

        assertEmailRejected();
    }

    @Test
    @DisplayName("UTCID08 - Blank Google email is rejected")
    void blankEmailRejected() throws IOException, ServletException {
        logInWithEmail("   ");

        assertEmailRejected();
    }

    @Test
    @DisplayName("UTCID09 - Existing account is saved with an updated last login")
    void existingUserLastLoginUpdated() throws IOException, ServletException {
        User user = givenExistingUser(UserStatus.PENDING, null);
        LocalDateTime previousLogin = LocalDateTime.of(2020, 1, 1, 0, 0);
        user.setLastLogin(previousLogin);

        LocalDateTime beforeLogin = LocalDateTime.now();
        logInWithEmail(EMAIL);
        LocalDateTime afterLogin = LocalDateTime.now();

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertSame(user, savedUser.getValue());
        LocalDateTime lastLogin = savedUser.getValue().getLastLogin();
        assertNotNull(lastLogin);
        assertTrue(lastLogin.isAfter(previousLogin));
        assertTrue(!lastLogin.isBefore(beforeLogin) && !lastLogin.isAfter(afterLogin));
    }

    private User givenExistingUser(UserStatus status, String statusReason) {
        User user = User.builder()
            .userId(USER_ID)
            .email(EMAIL)
            .fullName("J-Tech Student")
            .googleSub("google-sub")
            .role(studentRole)
            .status(status)
            .statusReason(statusReason)
            .build();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);
        return user;
    }

    private void logInWithEmail(String email) throws IOException, ServletException {
        Map<String, String> attributes = new HashMap<>();
        attributes.put("email", email);
        attributes.put("name", "J-Tech Student");
        when(googleUser.<String>getAttribute(anyString())).thenAnswer(invocation ->
            attributes.get(invocation.getArgument(0, String.class))
        );
        handler.onAuthenticationSuccess(request, response, authentication);
    }

    private void assertEmailRejected() {
        assertEquals(FRONTEND_URL + "/login?error=no_email", response.getRedirectedUrl());
        verifyNoInteractions(userRepository, roleRepository);
        assertNoCredentialsIssued();
    }

    private void assertNoCredentialsIssued() {
        verify(refreshTokenRepository, never()).save(any());
        verifyNoInteractions(jwtService, exchangeStore, cookieService);
        assertTrue(response.getHeaders(HttpHeaders.SET_COOKIE).isEmpty());
    }
}
