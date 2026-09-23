package com.jtech.dto.request;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdateProfileRequest {

    @Size(max = 100)
    private String fullName;

    private LocalDate birthday;


    public UpdateProfileRequest() {
    }

    public UpdateProfileRequest(String fullName, LocalDate birthday) {
        this.fullName = fullName;
        this.birthday = birthday;
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

}
