package com.jtech.service;

import com.jtech.dto.request.RefreshTokenRequest;
import com.jtech.dto.request.UpdateProfileRequest;
import com.jtech.dto.response.UserResponse;

import java.security.Principal;

public interface AuthService {

    UserResponse refreshToken(RefreshTokenRequest request);


    void logout(String refreshToken);

    UserResponse getCurrentUser(Principal principal);

    UserResponse updateProfile(Long userId, UpdateProfileRequest request);
}

