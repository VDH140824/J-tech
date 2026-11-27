package com.jtech.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SystemSettingUpdateRequest(
    @NotNull Boolean announcementEnabled,
    @NotNull @Size(max = 200) String announcementTitle,
    @NotNull @Size(max = 2000) String announcementContent,
    @NotNull Boolean learningReminderEnabled,
    @NotNull Boolean feedbackEmailEnabled
) {}
