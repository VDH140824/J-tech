package com.jtech.dto.response;

import com.jtech.entity.UserStatus;
import java.time.LocalDateTime;

public record StudentResponse(Long id, String fullName, String email, String avatarUrl,
                              UserStatus status, LocalDateTime joinedAt) {
}
