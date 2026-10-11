package com.jtech.dto.request;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdateProfileRequest {

    @Size(max = 255)
    private String displayName;

    @Size(max = 100)
    private String fullName;

    private LocalDate dateOfBirth;

    @Size(max = 500)
    private String avatarUrl;

    @Size(max = 255)
    private String avatarPublicId;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String fullName, LocalDate dateOfBirth) {
        this.fullName = fullName;
        this.displayName = fullName;
        this.dateOfBirth = dateOfBirth;
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

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
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
