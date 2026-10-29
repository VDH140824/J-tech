package com.jtech.dto.request;

import com.jtech.entity.VocabularyMiniTest;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record VocabularyChapterTestRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10000) String description,
        @NotNull @Min(1) @Max(180) Integer durationMinutes,
        @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal passingScore,
        @NotNull VocabularyMiniTest.Status status,
        @NotEmpty @Size(max = 200) List<@NotNull @Positive Long> questionIds
) {}
