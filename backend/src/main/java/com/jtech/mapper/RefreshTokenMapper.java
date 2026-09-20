package com.jtech.mapper;

import com.jtech.dto.request.RefreshTokenRequest;
import com.jtech.entity.RefreshToken;

public final class RefreshTokenMapper {

    private RefreshTokenMapper() {
    }

    public static RefreshToken toEntity(RefreshTokenRequest request) {
        if (request == null) {
            return null;
        }

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setToken(request.getRefreshToken());
        return refreshToken;
    }
}
