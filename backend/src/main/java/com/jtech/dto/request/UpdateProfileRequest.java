package com.jtech.dto.request;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdateProfileRequest {

    @Size(max = 100)
    private String fullName;

    private LocalDate birthday;

    @Size(max = 100)
    private String country;

    @Size(max = 50)
    private String nativeLanguage;

    @Size(max = 500)
    private String bio;

    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String fullName, LocalDate birthday, String country, String nativeLanguage, String bio) {
        this.fullName = fullName;
        this.birthday = birthday;
        this.country = country;
        this.nativeLanguage = nativeLanguage;
        this.bio = bio;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public LocalDate getBirthday() {
        return birthday;
    }

    public void setBirthday(LocalDate birthday) {
        this.birthday = birthday;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getNativeLanguage() {
        return nativeLanguage;
    }

    public void setNativeLanguage(String nativeLanguage) {
        this.nativeLanguage = nativeLanguage;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }
}
