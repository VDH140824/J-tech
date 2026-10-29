package com.jtech.service.impl;

import com.jtech.dto.request.RefreshTokenRequest;
import com.jtech.dto.request.UpdateProfileRequest;
import com.jtech.dto.response.UserResponse;
import com.jtech.entity.RefreshToken;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.RefreshTokenRepository;
import com.jtech.repository.UserRepository;
import com.jtech.security.JwtService;
import com.jtech.service.AuthService;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.Principal;
import java.time.LocalDateTime;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final com.jtech.security.OAuth2ExchangeStore oAuth2ExchangeStore;

    public AuthServiceImpl(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
                           JwtService jwtService,
                           com.jtech.security.OAuth2ExchangeStore oAuth2ExchangeStore) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.oAuth2ExchangeStore = oAuth2ExchangeStore;
    }

    @Override @Transactional
    public UserResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) throw new IllegalArgumentException("Refresh token is required");
        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshToken).orElseThrow(() -> new IllegalArgumentException("Invalid or expired refresh token"));
        if (Boolean.TRUE.equals(storedToken.getRevoked()) || (storedToken.getExpiresAt() != null && storedToken.getExpiresAt().isBefore(LocalDateTime.now()))) {
            storedToken.setRevoked(true); refreshTokenRepository.save(storedToken); throw new IllegalArgumentException("Invalid or expired refresh token");
        }
        User user = storedToken.getUser();
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            storedToken.setRevoked(true);
            refreshTokenRepository.save(storedToken);
            throw new IllegalArgumentException("Account is not active");
        }
        UserResponse response = mapToUserResponse(user);
        response.setAccessToken(jwtService.generateToken(user.getEmail()));
        response.setRefreshToken(null);
        return response;
    }

    @Override @Transactional
    public UserResponse refreshToken(RefreshTokenRequest request) {
        return refreshToken(request != null ? request.getRefreshToken() : null);
    }

    @Override @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) refreshTokenRepository.findByToken(refreshToken).ifPresent(token -> { token.setRevoked(true); refreshTokenRepository.save(token); });
    }

    @Override @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) throw new IllegalArgumentException("Unauthenticated user");
        if (principal instanceof OAuth2AuthenticationToken oauth) {
            String email = oauth.getPrincipal().getAttribute("email");
            if (email == null || email.isBlank()) throw new IllegalArgumentException("OAuth2 account email not found");
            return mapToUserResponse(userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found")));
        }
        return mapToUserResponse(getAuthenticatedUser());
    }

    @Override @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = (userId != null)
                ? userRepository.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"))
                : getAuthenticatedUser();

        String name = request.getFullName();
        if (name != null) {
            user.setFullName(name.trim());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getAvatarPublicId() != null) {
            user.setAvatarPublicId(request.getAvatarPublicId().trim().isEmpty() ? null : request.getAvatarPublicId().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim().isEmpty() ? null : request.getAvatarUrl().trim());
        }
        user = userRepository.save(user);
        return mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse exchangeOAuth2Code(String code) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Exchange code is required");
        }
        // consume code
        com.jtech.security.OAuth2ExchangeStore.ExchangePayload payload = oAuth2ExchangeStore.consume(code);
        if (payload == null) {
            throw new IllegalArgumentException("Invalid or expired exchange code");
        }
        // get user from code
        User user = userRepository.findById(payload.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException("Account is not active");
        }
        UserResponse response = mapToUserResponse(user);
        response.setAccessToken(payload.getAccessToken());
        response.setRefreshToken(null);
        return response;
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) throw new AuthenticationCredentialsNotFoundException("Authenticated user is required");
        Object principal = authentication.getPrincipal();
        String email = principal instanceof UserDetails details ? details.getUsername() : authentication.getName();
        if (email == null || email.isBlank()) throw new AuthenticationCredentialsNotFoundException("Authenticated user is required");
        return userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private UserResponse mapToUserResponse(User user) {
        UserResponse response = new UserResponse();
        response.setId(user.getUserId());
        response.setFullName(user.getFullName());
        response.setDisplayName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setGoogleSub(user.getGoogleSub());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setAvatarPublicId(user.getAvatarPublicId());
        response.setStatus(user.getStatus() != null ? user.getStatus().name() : "PENDING");
        response.setStatusReason(user.getStatusReason());
        response.setCoinBalance(user.getCoinBalance());
        response.setCurrentStreak(user.getCurrentStreak());
        response.setLongestStreak(user.getLongestStreak());
        response.setLastStudyDate(user.getLastStudyDate());
        response.setReminderEnabled(user.getReminderEnabled());
        response.setReminderTime(user.getReminderTime());
        if (user.getRole() != null) {
            response.setRoleId(user.getRole().getRoleId());
            response.setRole(user.getRole().getRoleName());
            response.setRoleName(user.getRole().getName());
        }
        response.setReviewedAt(user.getReviewedAt());
        response.setLastLoginAt(user.getLastLogin());
        response.setLastLogin(user.getLastLogin());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }
}