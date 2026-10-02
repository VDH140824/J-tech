package com.jtech.dto.request;

import jakarta.validation.constraints.NotBlank;

public class ChangeUserRoleRequest {
    @NotBlank(message = "Role không được để trống")
    private String role;

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
