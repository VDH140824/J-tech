package com.jtech.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.controller.UserController;
import com.jtech.dto.request.RefreshTokenRequest;
import com.jtech.dto.request.UpdateProfileRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.entity.RefreshToken;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.repository.RefreshTokenRepository;
import com.jtech.repository.UserRepository;
import com.jtech.security.JwtService;
import com.jtech.security.OAuth2ExchangeStore;
import com.jtech.service.CloudinaryService;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests mock persistence, JWT, Cloudinary and the exchange store.
 * Tests tagged "known-gap" assert the approved requirements missing from production;
 * they remain enabled and fail until those requirements are implemented.
 * MockMvc tests verify backend error messages, not browser rendering or DB commits.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {
    private static final long USER_ID = 10L;
    private static final String EMAIL = "student@example.test";
    private static final String TOKEN = "refresh-token";
    private static final String CODE = "exchange-code";
    private static final Principal PRINCIPAL = () -> EMAIL;
    private static ValidatorFactory validatorFactory;

    @Mock UserRepository users;
    @Mock RefreshTokenRepository tokens;
    @Mock JwtService jwt;
    @Mock CloudinaryService cloudinary;
    @Mock OAuth2ExchangeStore exchangeStore;
    AuthServiceImpl service;
    User user;
    RefreshToken token;

    @BeforeAll static void openValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
    }

    @AfterAll static void closeValidator() {
        validatorFactory.close();
    }

    @BeforeEach void setUp() {
        SecurityContextHolder.clearContext();
        service = new AuthServiceImpl(users, tokens, jwt, cloudinary, exchangeStore);
        user = User.builder().userId(USER_ID).email(EMAIL).fullName("Nguyễn Văn An")
                .googleSub("google-sub").status(UserStatus.ACTIVE)
                .role(Role.builder().roleId(3L).roleName("STUDENT").name("Học viên").build())
                .dateOfBirth(LocalDate.of(2000, 5, 12)).avatarUrl("https://example.test/old.png")
                .avatarPublicId("old-avatar").statusReason("approved")
                .coinBalance(120).currentStreak(3).longestStreak(7)
                .lastStudyDate(LocalDate.of(2026, 1, 1)).reminderEnabled(true)
                .reminderTime(LocalTime.of(20, 30))
                .reviewedAt(LocalDateTime.of(2025, 1, 1, 10, 0))
                .lastLogin(LocalDateTime.of(2026, 1, 2, 11, 0))
                .createdAt(LocalDateTime.of(2024, 1, 1, 8, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 1, 9, 0)).build();
        token = RefreshToken.builder().tokenId(1L).token(TOKEN).user(user)
                .expiresAt(LocalDateTime.now().plusDays(1)).revoked(false).build();
    }

    @AfterEach void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test void refreshToken_success() {
        foundToken();
        when(jwt.generateToken(EMAIL)).thenReturn("new-access");
        UserResponse result = service.refreshToken(TOKEN);
        assertEquals(USER_ID, result.getId());
        assertEquals("new-access", result.getAccessToken());
        assertNull(result.getRefreshToken());
        verify(jwt).generateToken(EMAIL);
        verify(tokens, never()).save(any());
    }

    @ParameterizedTest @NullAndEmptySource
    void refreshToken_emptyToken(String value) {
        assertIllegal("Refresh token is required", () -> service.refreshToken(value));
        verifyNoInteractions(tokens, jwt);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void refreshToken_blankToken(String value) {
        assertIllegal("Refresh token is required", () -> service.refreshToken(value));
        verifyNoInteractions(tokens, jwt);
    }

    @Test void refreshToken_notFound() {
        assertIllegal("Invalid or expired refresh token", () -> service.refreshToken(TOKEN));
        verify(jwt, never()).generateToken(any());
    }

    @Test void refreshToken_revoked() {
        token.setRevoked(true);
        foundToken();
        assertIllegal("Invalid or expired refresh token", () -> service.refreshToken(TOKEN));
        verify(tokens).save(token);
        verifyNoInteractions(jwt);
    }

    @Test void refreshToken_expired() {
        token.setExpiresAt(LocalDateTime.now().minusDays(1));
        foundToken();
        assertIllegal("Invalid or expired refresh token", () -> service.refreshToken(TOKEN));
        assertTrue(token.getRevoked());
        verify(tokens).save(token);
        verifyNoInteractions(jwt);
    }

    @Test void refreshToken_missingUser() {
        token.setUser(null);
        foundToken();
        assertIllegal("Account is not active", () -> service.refreshToken(TOKEN));
        assertTrue(token.getRevoked());
        verify(tokens).save(token);
        verifyNoInteractions(jwt);
    }

    @ParameterizedTest @NullSource
    @EnumSource(value = UserStatus.class, names = "ACTIVE", mode = EnumSource.Mode.EXCLUDE)
    void refreshToken_inactiveUser(UserStatus status) {
        user.setStatus(status);
        foundToken();
        assertIllegal("Account is not active", () -> service.refreshToken(TOKEN));
        assertTrue(token.getRevoked());
        verify(tokens).save(token);
        verifyNoInteractions(jwt);
    }

    @Test void refreshToken_nullRevoked() {
        token.setRevoked(null);
        foundToken();
        when(jwt.generateToken(EMAIL)).thenReturn("access");
        assertEquals("access", service.refreshToken(TOKEN).getAccessToken());
    }

    @Test void refreshToken_nullExpiry() {
        // Characterizes the nullable branch; schema declares expires_at NOT NULL.
        token.setExpiresAt(null);
        foundToken();
        when(jwt.generateToken(EMAIL)).thenReturn("access");
        assertEquals("access", service.refreshToken(TOKEN).getAccessToken());
    }

    @Test void refreshToken_saveFailed() {
        token.setRevoked(true);
        foundToken();
        var failure = new DataIntegrityViolationException("save failed");
        when(tokens.save(token)).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.refreshToken(TOKEN)));
        verifyNoInteractions(jwt);
    }

    @Test void refreshToken_generateFailed() {
        foundToken();
        var failure = new IllegalStateException("JWT unavailable");
        when(jwt.generateToken(EMAIL)).thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class, () -> service.refreshToken(TOKEN)));
    }

    @Test void refreshTokenRequest_success() {
        foundToken();
        when(jwt.generateToken(EMAIL)).thenReturn("access");
        var result = service.refreshToken(new RefreshTokenRequest(TOKEN));
        assertEquals("access", result.getAccessToken());
        assertNull(result.getRefreshToken());
        verify(tokens).findByToken(TOKEN);
    }

    @Test void refreshTokenRequest_nullRequest() {
        assertIllegal("Refresh token is required", () -> service.refreshToken((RefreshTokenRequest) null));
        verifyNoInteractions(tokens, jwt);
    }

    @ParameterizedTest @NullAndEmptySource
    void refreshTokenRequest_emptyToken(String value) {
        assertIllegal("Refresh token is required", () -> service.refreshToken(new RefreshTokenRequest(value)));
        verifyNoInteractions(tokens, jwt);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void refreshTokenRequest_blankToken(String value) {
        assertIllegal("Refresh token is required", () -> service.refreshToken(new RefreshTokenRequest(value)));
        verifyNoInteractions(tokens, jwt);
    }

    @Test void refreshTokenRequest_invalidToken() {
        assertIllegal("Invalid or expired refresh token", () -> service.refreshToken(new RefreshTokenRequest(TOKEN)));
        verifyNoInteractions(jwt);
    }

    @Test void logout_success() {
        foundToken();
        service.logout(TOKEN);
        assertTrue(token.getRevoked());
        verify(tokens).save(token);
    }

    @ParameterizedTest @NullAndEmptySource
    void logout_emptyToken(String value) {
        assertDoesNotThrow(() -> service.logout(value));
        verifyNoInteractions(tokens);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void logout_blankToken(String value) {
        service.logout(value);
        verifyNoInteractions(tokens);
    }

    @Test void logout_notFound() {
        assertDoesNotThrow(() -> service.logout(TOKEN));
        verify(tokens, never()).save(any());
    }

    @Test void logout_alreadyRevoked() {
        token.setRevoked(true);
        foundToken();
        service.logout(TOKEN);
        assertTrue(token.getRevoked());
        verify(tokens).save(token);
    }

    @Test void logout_saveFailed() {
        foundToken();
        var failure = new DataIntegrityViolationException("save failed");
        when(tokens.save(token)).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.logout(TOKEN)));
    }

    @Test void getCurrentUser_success() {
        authenticatedUser();
        assertEquals(USER_ID, service.getCurrentUser(PRINCIPAL).getId());
        verify(users).findByEmail(EMAIL);
    }

    @Test void getCurrentUser_nullPrincipal() {
        assertIllegal("Unauthenticated user", () -> service.getCurrentUser(null));
        verifyNoInteractions(users);
    }

    @ParameterizedTest @NullAndEmptySource
    void getCurrentUser_emptyName(String name) {
        assertIllegal("Unauthenticated user", () -> service.getCurrentUser(() -> name));
        verifyNoInteractions(users);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void getCurrentUser_blankName(String name) {
        assertIllegal("Unauthenticated user", () -> service.getCurrentUser(() -> name));
        verifyNoInteractions(users);
    }

    @Test void getCurrentUser_oauthSuccess() {
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        assertEquals(USER_ID, service.getCurrentUser(oauth(EMAIL)).getId());
        verify(users).findByEmail(EMAIL);
    }

    @ParameterizedTest @NullAndEmptySource
    void getCurrentUser_oauthEmptyEmail(String email) {
        assertIllegal("OAuth2 account email not found", () -> service.getCurrentUser(oauth(email)));
        verifyNoInteractions(users);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void getCurrentUser_oauthBlankEmail(String email) {
        assertIllegal("OAuth2 account email not found", () -> service.getCurrentUser(oauth(email)));
        verifyNoInteractions(users);
    }

    @Test void getCurrentUser_oauthUserNotFound() {
        assertIllegal("User not found", () -> service.getCurrentUser(oauth(EMAIL)));
    }

    @Test void getCurrentUser_noAuthentication() {
        assertCredentials(() -> service.getCurrentUser(PRINCIPAL));
        verifyNoInteractions(users);
    }

    @Test void getCurrentUser_notAuthenticated() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(EMAIL, "unused"));
        assertCredentials(() -> service.getCurrentUser(PRINCIPAL));
        verifyNoInteractions(users);
    }

    @Test void getCurrentUser_userDetails() {
        UserDetails details = mock(UserDetails.class);
        when(details.getUsername()).thenReturn(EMAIL);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, List.of()));
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        assertEquals(USER_ID, service.getCurrentUser(PRINCIPAL).getId());
    }

    @Test void getCurrentUser_authenticationName() {
        authenticatedUser();
        // The argument confirms a principal exists; identity comes from SecurityContext.
        assertEquals(EMAIL, service.getCurrentUser(() -> "different-principal").getEmail());
    }

    @ParameterizedTest @NullAndEmptySource
    void getCurrentUser_emptyEmail(String email) {
        authenticationWithName(email);
        assertCredentials(() -> service.getCurrentUser(PRINCIPAL));
        verifyNoInteractions(users);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void getCurrentUser_blankEmail(String email) {
        authenticationWithName(email);
        assertCredentials(() -> service.getCurrentUser(PRINCIPAL));
        verifyNoInteractions(users);
    }

    @Test void getCurrentUser_userNotFound() {
        authenticate();
        assertIllegal("User not found", () -> service.getCurrentUser(PRINCIPAL));
    }

    @Test @Tag("known-gap")
    void getCurrentUser_anonymous() {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        assertCredentials(() -> service.getCurrentUser(PRINCIPAL));
        verifyNoInteractions(users);
    }

    @Test void updateProfile_success() {
        profileUser();
        var request = new UpdateProfileRequest("Tên mới", LocalDate.of(2001, 6, 15));
        request.setAvatarUrl("https://example.test/new.png");
        request.setAvatarPublicId("new-avatar");
        var result = service.updateProfile(USER_ID, request);
        assertAll(() -> assertEquals("Tên mới", result.getFullName()),
                () -> assertEquals(LocalDate.parse(request.getDateOfBirth()), result.getDateOfBirth()),
                () -> assertEquals(request.getAvatarUrl(), result.getAvatarUrl()),
                () -> assertEquals(request.getAvatarPublicId(), result.getAvatarPublicId()),
                () -> assertEquals(EMAIL, result.getEmail()),
                () -> assertEquals(UserStatus.ACTIVE.name(), result.getStatus()));
        verify(users).save(user);
    }

    @Test void updateProfile_currentUser() {
        authenticatedUser();
        saveReturnsUser();
        assertEquals("Tên mới", service.updateProfile(null, new UpdateProfileRequest("Tên mới", null)).getFullName());
        verify(users, never()).findById(any());
        verify(users).save(user);
    }

    @Test void updateProfile_userNotFound() {
        assertIllegal("User not found", () -> service.updateProfile(USER_ID, new UpdateProfileRequest("Tên mới", null)));
        verify(users, never()).save(any());
    }

    @Test void updateProfile_unauthenticated() {
        assertCredentials(() -> service.updateProfile(null, new UpdateProfileRequest("Tên mới", null)));
        verifyNoInteractions(users);
    }

    @Test void updateProfile_trimFullName() {
        profileUser();
        assertEquals("Tên mới", service.updateProfile(USER_ID, new UpdateProfileRequest(" \tTên mới \r\n", null)).getFullName());
    }

    @Test void updateProfile_fullNameSpaces() {
        profileUser();
        assertEquals("Nguyễn  Văn An", service.updateProfile(USER_ID,
                new UpdateProfileRequest("Nguyễn  Văn An", null)).getFullName());
    }

    @Test void updateProfile_displayNameFallback() {
        profileUser();
        var request = new UpdateProfileRequest();
        request.setDisplayName("Tên hiển thị");
        assertEquals("Tên hiển thị", service.updateProfile(USER_ID, request).getFullName());
    }

    @Test void updateProfile_fullNamePriority() {
        profileUser();
        var request = new UpdateProfileRequest("Họ tên", null);
        request.setDisplayName("Tên hiển thị");
        assertEquals("Họ tên", service.updateProfile(USER_ID, request).getFullName());
    }

    @Test void updateProfile_keepNullFields() {
        profileUser();
        var result = service.updateProfile(USER_ID, new UpdateProfileRequest("Nguyễn Văn An", null));
        assertAll(() -> assertEquals("Nguyễn Văn An", result.getFullName()),
                () -> assertEquals(LocalDate.of(2000, 5, 12), result.getDateOfBirth()),
                () -> assertEquals("https://example.test/old.png", result.getAvatarUrl()),
                () -> assertEquals("old-avatar", result.getAvatarPublicId()));
    }

    @Test void updateProfile_trimAvatar() {
        profileUser();
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        request.setAvatarUrl(" \thttps://example.test/new.png \n");
        request.setAvatarPublicId(" \tnew-avatar \n");
        var result = service.updateProfile(USER_ID, request);
        assertEquals("https://example.test/new.png", result.getAvatarUrl());
        assertEquals("new-avatar", result.getAvatarPublicId());
    }

    static Stream<Arguments> emptyAvatarFields() {
        return Stream.of(true, false).flatMap(url ->
                Stream.of("", "   ", "\t\r\n").map(value -> Arguments.of(url, value)));
    }

    @ParameterizedTest @MethodSource("emptyAvatarFields")
    void updateProfile_clearAvatar(boolean url, String value) {
        profileUser();
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        if (url) request.setAvatarUrl(value);
        else request.setAvatarPublicId(value);
        var result = service.updateProfile(USER_ID, request);
        if (url) {
            assertNull(result.getAvatarUrl());
            assertEquals("old-avatar", result.getAvatarPublicId());
        } else {
            assertNull(result.getAvatarPublicId());
            assertEquals("https://example.test/old.png", result.getAvatarUrl());
        }
    }

    @Test void updateProfile_saveFailed() {
        authenticatedUser();
        when(users.findById(USER_ID)).thenReturn(Optional.of(user));
        var failure = new DataIntegrityViolationException("save failed");
        when(users.save(user)).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                () -> service.updateProfile(USER_ID, new UpdateProfileRequest("Tên mới", null))));
    }

    @ParameterizedTest @ValueSource(strings = {"a", "ế", "語"})
    void updateProfile_fullNameMaxLength(String character) {
        var request = new UpdateProfileRequest(character.repeat(50), null);
        assertTrue(validatorFactory.getValidator().validate(request).isEmpty());
    }

    @ParameterizedTest @ValueSource(strings = {"a", "ế", "語"})
    void updateProfile_fullNameTooLong(String character) {
        assertProfileRejected(new UpdateProfileRequest(character.repeat(51), null));
    }

    @Test
    void updateProfile_emptyFullName() {
        assertProfileRejected(new UpdateProfileRequest("", null));
    }

    @ParameterizedTest @ValueSource(strings = {"   ", "\t\r\n"})
    void updateProfile_blankFullName(String name) {
        assertProfileRejected(new UpdateProfileRequest(name, null));
    }

    @Test
    void updateProfile_displayNameTooLong() {
        var request = new UpdateProfileRequest();
        request.setDisplayName("a".repeat(51));
        assertProfileRejected(request);
    }

    @Test
    void updateProfile_nullRequest() {
        assertProfileRejected(null);
    }

    @Test @Tag("known-gap")
    void updateProfile_otherUser() {
        authenticate();
        User other = User.builder().userId(99L).email("other@example.test").fullName("Other").build();
        // Lenient stubs permit a future implementation to reject before looking up the target.
        lenient().when(users.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        lenient().when(users.findById(99L)).thenReturn(Optional.of(other));
        lenient().when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        assertThrows(AccessDeniedException.class,
                () -> service.updateProfile(99L, new UpdateProfileRequest("Tên mới", null)));
        verify(users, never()).save(any());
    }

    @Test void updateProfile_avatarUrlMaxLength() {
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        request.setAvatarUrl("a".repeat(500));
        assertTrue(validatorFactory.getValidator().validate(request).isEmpty());
    }

    @Test void updateProfile_avatarUrlTooLong() {
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        request.setAvatarUrl("a".repeat(501));
        assertInvalidField(request, "avatarUrl");
    }

    @Test void updateProfile_avatarPublicIdMaxLength() {
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        request.setAvatarPublicId("a".repeat(255));
        assertTrue(validatorFactory.getValidator().validate(request).isEmpty());
    }

    @Test void updateProfile_avatarPublicIdTooLong() {
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        request.setAvatarPublicId("a".repeat(256));
        assertInvalidField(request, "avatarPublicId");
    }

    @Test void updateProfile_validBirthDate() {
        profileUser();
        var result = service.updateProfile(USER_ID,
                new UpdateProfileRequest("Nguyễn Văn An", LocalDate.of(2000, 2, 29)));
        assertEquals(LocalDate.of(2000, 2, 29), result.getDateOfBirth());
    }

    @Test void updateProfile_futureBirthDate() {
        var request = new UpdateProfileRequest("Nguyễn Văn An", LocalDate.now().plusDays(1));
        assertIllegal("Ngày sinh không được ở tương lai", () -> service.updateProfile(USER_ID, request));
        verifyNoInteractions(users);
    }

    @Test void updateProfile_futureBirthDateMessage() throws Exception {
        String date = LocalDate.now().plusDays(1).toString();
        mvc().perform(put("/users/profile").param("userId", Long.toString(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(Map.of(
                                "fullName", "Nguyễn Văn An", "dateOfBirth", date))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Ngày sinh không được ở tương lai"));
        verifyNoInteractions(users);
    }

    @ParameterizedTest @ValueSource(strings = {"01/12/2000", "2000-13-01", "2000-02-30", "abc"})
    void updateProfile_invalidBirthDateMessage(String date) throws Exception {
        mvc().perform(put("/users/profile").param("userId", Long.toString(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(Map.of(
                                "fullName", "Nguyễn Văn An", "dateOfBirth", date))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Ngày sinh không hợp lệ. Nhập theo định dạng yyyy-MM-dd."));
        verifyNoInteractions(users);
    }

    @ParameterizedTest @ValueSource(strings = {"01/12/2000", "2000-13-01", "2000-02-30", "abc", " "})
    void updateProfile_invalidBirthDateInService(String date) {
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        request.setDateOfBirth(date);
        assertIllegal("Ngày sinh không hợp lệ. Nhập theo định dạng yyyy-MM-dd.",
                () -> service.updateProfile(USER_ID, request));
        verifyNoInteractions(users);
    }

    @Test void updateProfile_emptyNameMessage() throws Exception {
        mvc().perform(put("/users/profile").param("userId", Long.toString(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Họ tên không được để trống"));
        verifyNoInteractions(users);
    }

    @Test void updateAvatar_success() {
        authenticatedUser();
        saveReturnsUser();
        MultipartFile file = avatar();
        when(cloudinary.uploadAvatar(file)).thenReturn(Map.of("url", "https://example.test/new.png", "publicId", "new-avatar"));
        var result = service.updateAvatar(file);
        assertEquals("https://example.test/new.png", result.getAvatarUrl());
        assertEquals("new-avatar", result.getAvatarPublicId());
        assertEquals(USER_ID, result.getId());
        var order = inOrder(cloudinary, users);
        order.verify(users).findByEmail(EMAIL);
        order.verify(cloudinary).uploadAvatar(file);
        order.verify(users).save(user);
    }

    @Test void updateAvatar_unauthenticated() {
        assertCredentials(() -> service.updateAvatar(avatar()));
        verifyNoInteractions(users, cloudinary);
    }

    @Test void updateAvatar_userNotFound() {
        authenticate();
        assertIllegal("User not found", () -> service.updateAvatar(avatar()));
        verifyNoInteractions(cloudinary);
        verify(users, never()).save(any());
    }

    @Test void updateAvatar_invalidFile() {
        authenticatedUser();
        MultipartFile file = avatar();
        when(cloudinary.uploadAvatar(file)).thenThrow(new IllegalArgumentException("Ảnh không hợp lệ"));
        assertIllegal("Ảnh không hợp lệ", () -> service.updateAvatar(file));
        verify(users, never()).save(any());
        assertEquals("old-avatar", user.getAvatarPublicId());
    }

    @Test void updateAvatar_uploadFailed() {
        authenticatedUser();
        MultipartFile file = avatar();
        var failure = new IllegalStateException("Upload failed");
        when(cloudinary.uploadAvatar(file)).thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class, () -> service.updateAvatar(file)));
        verify(users, never()).save(any());
        assertEquals("old-avatar", user.getAvatarPublicId());
    }

    @Test void updateAvatar_saveFailed() {
        authenticatedUser();
        MultipartFile file = avatar();
        when(cloudinary.uploadAvatar(file)).thenReturn(Map.of("url", "https://example.test/new.png", "publicId", "new-avatar"));
        var failure = new DataIntegrityViolationException("save failed");
        when(users.save(user)).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.updateAvatar(file)));
    }

    @Test void exchangeOAuth2Code_success() {
        foundExchange();
        var result = service.exchangeOAuth2Code(CODE);
        assertEquals(USER_ID, result.getId());
        assertEquals("exchange-access", result.getAccessToken());
        assertNull(result.getRefreshToken());
        verify(exchangeStore).consume(CODE);
        verifyNoInteractions(jwt, tokens);
    }

    @ParameterizedTest @NullAndEmptySource
    void exchangeOAuth2Code_emptyCode(String code) {
        assertIllegal("Exchange code is required", () -> service.exchangeOAuth2Code(code));
        verifyNoInteractions(exchangeStore, users);
    }

    @ParameterizedTest @ValueSource(strings = {" ", "\t\r\n"})
    void exchangeOAuth2Code_blankCode(String code) {
        assertIllegal("Exchange code is required", () -> service.exchangeOAuth2Code(code));
        verifyNoInteractions(exchangeStore, users);
    }

    @Test void exchangeOAuth2Code_invalidCode() {
        assertIllegal("Invalid or expired exchange code", () -> service.exchangeOAuth2Code(CODE));
        verifyNoInteractions(users, jwt);
    }

    @Test void exchangeOAuth2Code_userNotFound() {
        when(exchangeStore.consume(CODE)).thenReturn(exchangePayload());
        assertIllegal("User not found", () -> service.exchangeOAuth2Code(CODE));
        verifyNoInteractions(jwt);
    }

    @ParameterizedTest @NullSource
    @EnumSource(value = UserStatus.class, names = "ACTIVE", mode = EnumSource.Mode.EXCLUDE)
    void exchangeOAuth2Code_inactiveUser(UserStatus status) {
        user.setStatus(status);
        foundExchange();
        assertIllegal("Account is not active", () -> service.exchangeOAuth2Code(CODE));
        verifyNoInteractions(jwt);
    }

    @Test void exchangeOAuth2Code_storeFailed() {
        var failure = new IllegalStateException("Store unavailable");
        when(exchangeStore.consume(CODE)).thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class, () -> service.exchangeOAuth2Code(CODE)));
        verifyNoInteractions(users);
    }

    @Test void getCurrentUser_mapFields() {
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertAll(() -> assertEquals(user.getUserId(), result.getId()),
                () -> assertEquals(user.getEmail(), result.getEmail()),
                () -> assertEquals(user.getGoogleSub(), result.getGoogleSub()),
                () -> assertEquals(user.getFullName(), result.getFullName()),
                () -> assertEquals(user.getDateOfBirth(), result.getDateOfBirth()),
                () -> assertEquals(user.getAvatarUrl(), result.getAvatarUrl()),
                () -> assertEquals(user.getAvatarPublicId(), result.getAvatarPublicId()),
                () -> assertEquals(user.getStatus().name(), result.getStatus()),
                () -> assertEquals(user.getStatusReason(), result.getStatusReason()),
                () -> assertEquals(user.getCoinBalance(), result.getCoinBalance()),
                () -> assertEquals(user.getCurrentStreak(), result.getCurrentStreak()),
                () -> assertEquals(user.getLongestStreak(), result.getLongestStreak()),
                () -> assertEquals(user.getLastStudyDate(), result.getLastStudyDate()),
                () -> assertEquals(user.getReminderEnabled(), result.getReminderEnabled()),
                () -> assertEquals(user.getReminderTime(), result.getReminderTime()),
                () -> assertEquals(user.getReviewedAt(), result.getReviewedAt()),
                () -> assertEquals(user.getCreatedAt(), result.getCreatedAt()),
                () -> assertEquals(user.getUpdatedAt(), result.getUpdatedAt()));
    }

    @Test void getCurrentUser_mapRole() {
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertEquals(3L, result.getRoleId());
        assertEquals("STUDENT", result.getRole());
        assertEquals("Học viên", result.getRoleName());
    }

    @Test void getCurrentUser_nullRole() {
        user.setRole(null);
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertNull(result.getRoleId());
        assertNull(result.getRole());
        assertNull(result.getRoleName());
    }

    @Test void getCurrentUser_defaultStatus() {
        user.setStatus(null);
        authenticatedUser();
        assertEquals("PENDING", service.getCurrentUser(PRINCIPAL).getStatus());
    }

    @Test void getCurrentUser_nullOptionalFields() {
        user = User.builder().userId(USER_ID).email(EMAIL).status(UserStatus.ACTIVE).build();
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertAll(() -> assertNull(result.getFullName()), () -> assertNull(result.getDisplayName()),
                () -> assertNull(result.getGoogleSub()), () -> assertNull(result.getDateOfBirth()),
                () -> assertNull(result.getAvatarUrl()), () -> assertNull(result.getAvatarPublicId()),
                () -> assertNull(result.getStatusReason()), () -> assertNull(result.getLastStudyDate()),
                () -> assertNull(result.getReviewedAt()), () -> assertNull(result.getLastLogin()),
                () -> assertNull(result.getCreatedAt()), () -> assertNull(result.getUpdatedAt()));
    }

    @Test void getCurrentUser_nameAliases() {
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertEquals(user.getFullName(), result.getFullName());
        assertEquals(user.getFullName(), result.getDisplayName());
    }

    @Test void getCurrentUser_loginAliases() {
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertEquals(user.getLastLogin(), result.getLastLoginAt());
        assertEquals(user.getLastLogin(), result.getLastLogin());
    }

    @Test void getCurrentUser_noTokens() {
        authenticatedUser();
        var result = service.getCurrentUser(PRINCIPAL);
        assertNull(result.getAccessToken());
        assertNull(result.getRefreshToken());
    }

    static Stream<Arguments> profileHttpErrors() {
        return Stream.of(Arguments.of("fullName", 51), Arguments.of("displayName", 51),
                Arguments.of("avatarUrl", 501), Arguments.of("avatarPublicId", 256));
    }

    @ParameterizedTest @MethodSource("profileHttpErrors")
    void updateProfile_validationMessage(String field, int length) throws Exception {
        var request = new UpdateProfileRequest("Nguyễn Văn An", null);
        String value = "a".repeat(length);
        switch (field) {
            case "fullName" -> request.setFullName(value);
            case "displayName" -> request.setDisplayName(value);
            case "avatarUrl" -> request.setAvatarUrl(value);
            case "avatarPublicId" -> request.setAvatarPublicId(value);
            default -> fail("Unknown field");
        }
        String expected = validatorFactory.getValidator().validate(request).iterator().next().getMessage();
        Map<String, String> body = new HashMap<>();
        body.put("fullName", "Nguyễn Văn An");
        body.put(field, value);
        mvc().perform(put("/users/profile").param("userId", Long.toString(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(expected));
        verifyNoInteractions(users);
    }

    @Test void updateProfile_serviceErrorMessage() throws Exception {
        mvc().perform(put("/users/profile").param("userId", Long.toString(USER_ID))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"fullName\":\"Tên mới\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("User not found"));
        verify(users, never()).save(any());
    }

    @Test void updateAvatar_validationMessage() throws Exception {
        authenticatedUser();
        MockMultipartFile file = avatar();
        String message = "Ảnh phải là JPG, PNG hoặc WebP và không quá 5 MB";
        when(cloudinary.uploadAvatar(any())).thenThrow(new IllegalArgumentException(message));
        mvc().perform(multipart("/users/me/avatar").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(message));
        verify(users, never()).save(any());
    }

    private MockMvc mvc() {
        return MockMvcBuilders.standaloneSetup(new UserController(service))
                .setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(
                        new ObjectMapper().findAndRegisterModules()))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    private void foundToken() {
        when(tokens.findByToken(TOKEN)).thenReturn(Optional.of(token));
    }

    private void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                EMAIL, null, List.of(new SimpleGrantedAuthority("ROLE_STUDENT"))));
    }

    private void authenticatedUser() {
        authenticate();
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(user));
    }

    private void authenticationWithName(String name) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(name);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private OAuth2AuthenticationToken oauth(String email) {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", "oauth-user");
        if (email != null) attributes.put("email", email);
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        return new OAuth2AuthenticationToken(new DefaultOAuth2User(authorities, attributes, "sub"), authorities, "google");
    }

    private void profileUser() {
        authenticatedUser();
        when(users.findById(USER_ID)).thenReturn(Optional.of(user));
        saveReturnsUser();
    }

    private void saveReturnsUser() {
        when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void assertProfileRejected(UpdateProfileRequest request) {
        // Both current implementation and a corrected implementation can run without mock-induced errors.
        authenticate();
        lenient().when(users.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        lenient().when(users.findById(USER_ID)).thenReturn(Optional.of(user));
        lenient().when(users.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        var error = assertThrows(IllegalArgumentException.class, () -> service.updateProfile(USER_ID, request));
        assertNotNull(error.getMessage());
        assertFalse(error.getMessage().isBlank());
        verify(users, never()).save(any());
    }

    private void assertInvalidField(UpdateProfileRequest request, String field) {
        var violations = validatorFactory.getValidator().validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals(field)));
    }

    private MockMultipartFile avatar() {
        return new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});
    }

    private OAuth2ExchangeStore.ExchangePayload exchangePayload() {
        return new OAuth2ExchangeStore.ExchangePayload(USER_ID, "exchange-access", "private-refresh", Instant.now().plusSeconds(60));
    }

    private void foundExchange() {
        when(exchangeStore.consume(CODE)).thenReturn(exchangePayload());
        when(users.findById(USER_ID)).thenReturn(Optional.of(user));
    }

    private void assertIllegal(String message, org.junit.jupiter.api.function.Executable action) {
        assertEquals(message, assertThrows(IllegalArgumentException.class, action).getMessage());
    }

    private void assertCredentials(org.junit.jupiter.api.function.Executable action) {
        assertEquals("Authenticated user is required",
                assertThrows(AuthenticationCredentialsNotFoundException.class, action).getMessage());
    }
}

