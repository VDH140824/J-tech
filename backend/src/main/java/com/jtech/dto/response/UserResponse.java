package com.jtech.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class UserResponse {
    private Long id;
    private Long roleId;
    private String role;
    private String roleName;
    private String email;
    private String googleSub;
    private String fullName;
    private String displayName;
    private String avatarUrl;
    private String avatarPublicId;
    private LocalDate dateOfBirth;
    private String status;
    private String statusReason;
    private Integer coinBalance;
    private Long reviewedById;
    private String reviewedByEmail;
    private LocalDateTime reviewedAt;
    private Long createdById;
    private String createdByEmail;
    private LocalDateTime lastLoginAt;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String accessToken;
    private String refreshToken;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getRoleId() { return roleId; }
    public void setRoleId(Long roleId) { this.roleId = roleId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getGoogleSub() { return googleSub; }
    public void setGoogleSub(String googleSub) { this.googleSub = googleSub; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; this.displayName = fullName; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; this.fullName = displayName; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public String getAvatarPublicId() { return avatarPublicId; }
    public void setAvatarPublicId(String avatarPublicId) { this.avatarPublicId = avatarPublicId; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
    public Integer getCoinBalance() { return coinBalance; }
    public void setCoinBalance(Integer coinBalance) { this.coinBalance = coinBalance; }
    public Long getReviewedById() { return reviewedById; }
    public void setReviewedById(Long reviewedById) { this.reviewedById = reviewedById; }
    public String getReviewedByEmail() { return reviewedByEmail; }
    public void setReviewedByEmail(String reviewedByEmail) { this.reviewedByEmail = reviewedByEmail; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public Long getCreatedById() { return createdById; }
    public void setCreatedById(Long createdById) { this.createdById = createdById; }
    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }
    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; this.lastLogin = lastLoginAt; }
    public LocalDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(LocalDateTime lastLogin) { this.lastLogin = lastLogin; this.lastLoginAt = lastLogin; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }
}
