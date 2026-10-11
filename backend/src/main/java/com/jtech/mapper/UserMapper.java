package com.jtech.mapper;

import com.jtech.dto.response.UserResponse;
import com.jtech.entity.User;

public final class UserMapper {
    private UserMapper() {}

    public static UserResponse toResponse(User user) {
        if (user == null) return null;
        UserResponse response = new UserResponse();
        response.setId(user.getUserId());
        response.setFullName(user.getFullName());
        response.setDisplayName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setGoogleSub(user.getGoogleSub());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setAvatarPublicId(user.getAvatarPublicId());
        response.setStatus(user.getStatus() != null ? user.getStatus().name() : null);
        response.setStatusReason(user.getStatusReason());
        response.setCoinBalance(user.getCoinBalance());
        response.setRole(user.getRole() != null ? user.getRole().getRoleName() : null);
        response.setRoleName(user.getRole() != null ? user.getRole().getName() : null);
        response.setRoleId(user.getRole() != null ? user.getRole().getRoleId() : null);
        if (user.getReviewedBy() != null) {
            response.setReviewedById(user.getReviewedBy().getUserId());
            response.setReviewedByEmail(user.getReviewedBy().getEmail());
        }
        response.setReviewedAt(user.getReviewedAt());
        if (user.getCreatedBy() != null) {
            response.setCreatedById(user.getCreatedBy().getUserId());
            response.setCreatedByEmail(user.getCreatedBy().getEmail());
        }
        response.setLastLoginAt(user.getLastLogin());
        response.setLastLogin(user.getLastLogin());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }
}
