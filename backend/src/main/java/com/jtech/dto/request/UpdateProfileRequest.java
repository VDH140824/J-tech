package com.jtech.dto.request;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDate;

public class UpdateProfileRequest {

    @Size(max = 50, message = "Họ tên không quá 50 ký tự")
    private String displayName;

    @Size(max = 50, message = "Họ tên không quá 50 ký tự")
    private String fullName;

    private String dateOfBirth;

    @Size(max = 500)
    private String avatarUrl;

    @Size(max = 255)
    private String avatarPublicId;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String fullName, LocalDate dateOfBirth) {
        this.fullName = fullName;
        this.displayName = fullName;
        this.dateOfBirth = dateOfBirth == null ? null : dateOfBirth.toString();
    }

    public String getDisplayName() {
        return displayName != null ? displayName : fullName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getFullName() {
        return fullName != null ? fullName : displayName;
    }

    @AssertTrue(message = "Họ tên không được để trống")
    @JsonIgnore
    public boolean isValidFullName() {
        return getFullName() != null && !getFullName().isBlank();
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(String dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getAvatarPublicId() {
        return avatarPublicId;
    }

    public void setAvatarPublicId(String avatarPublicId) {
        this.avatarPublicId = avatarPublicId;
    }
}
