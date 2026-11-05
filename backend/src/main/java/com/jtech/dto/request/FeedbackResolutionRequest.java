package com.jtech.dto.request;

import jakarta.validation.constraints.*;

public record FeedbackResolutionRequest(
    @NotNull Status status,
    @Size(max = 10000) String resolutionNote,
    @PositiveOrZero Long expectedVersion
) {
    public FeedbackResolutionRequest(Status status, String resolutionNote) {
        this(status, resolutionNote, null);
    }
    public enum Status {
        IN_PROGRESS,
        RESOLVED,
        REJECTED,
    }
}
