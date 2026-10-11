package com.jtech.dto.request;

import jakarta.validation.constraints.NotBlank;

public class AdminUserStatusRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    private String status;

    private String statusReason;

    public AdminUserStatusRequest() {}

    public AdminUserStatusRequest(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStatusReason() { return statusReason; }
    public void setStatusReason(String statusReason) { this.statusReason = statusReason; }
}
