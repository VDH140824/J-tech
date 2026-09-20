package com.jtech.mapper;

import com.jtech.dto.response.UserResponse;
import com.jtech.entity.User;

public final class UserMapper {

    private UserMapper() {
    }

    public static UserResponse toResponse(User user) {
        if (user == null) {
            return null;
        }

        UserResponse response = new UserResponse();
        response.setId(user.getUserId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setStatus(user.getStatus() != null ? user.getStatus().name() : null);
        response.setEmailVerified(user.getEmailVerified());
        response.setRole(user.getRole() != null ? user.getRole().getRoleName() : null);
        response.setRoleId(user.getRole() != null ? user.getRole().getRoleId() : null);
        response.setLastLogin(user.getLastLogin());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        return response;
    }

}
