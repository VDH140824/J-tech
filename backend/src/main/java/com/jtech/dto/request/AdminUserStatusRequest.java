package com.jtech.dto.request;

import jakarta.validation.constraints.NotBlank;

public class AdminUserStatusRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;

    public AdminUserStatusRequest() {}

    public AdminUserStatusRequest(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
