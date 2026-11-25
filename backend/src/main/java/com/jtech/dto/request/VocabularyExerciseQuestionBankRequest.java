package com.jtech.dto.request;

import com.jtech.entity.VocabularyTest;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record VocabularyExerciseQuestionBankRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 10000) String description,
    @NotNull @Min(5) @Max(30) Integer durationMinutes,
    @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal passingScore,
    @NotNull VocabularyTest.Status status,
    @NotEmpty List<@NotNull @Positive Long> questionIds
) {}
