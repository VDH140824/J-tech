package com.jtech.dto.request;

import jakarta.validation.constraints.*;

public record FeedbackResolutionRequest(@NotNull Status status, @Size(max = 10000) String resolutionNote) {
    public enum Status { IN_PROGRESS, RESOLVED, REJECTED }
}
