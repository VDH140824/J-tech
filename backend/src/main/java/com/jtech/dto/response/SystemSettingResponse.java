package com.jtech.dto.response;

import com.jtech.dto.request.SystemSettingUpdateRequest;
import java.time.LocalDateTime;

public record SystemSettingResponse(SystemSettingUpdateRequest settings, Long updatedBy,
    String updatedByName, LocalDateTime updatedAt) {}
