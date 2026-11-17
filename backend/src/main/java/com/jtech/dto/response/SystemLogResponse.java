package com.jtech.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;

public record SystemLogResponse(Long id, Long userId, String fullName, String email,
    String action, String entityType, Long entityId, String level, JsonNode detail,
    String ipAddress, String userAgent, LocalDateTime createdAt) {}
