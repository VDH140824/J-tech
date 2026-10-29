package com.jtech.dto.request;

import jakarta.validation.constraints.*;

public record FeedbackRequest(
        @NotNull Type feedbackType,
        @NotBlank @Size(max = 50) String category,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 10000) String content,
        @Positive Long lessonId,
        @Positive Long questionId) {
    public enum Type { CONTENT, TECHNICAL }
}
