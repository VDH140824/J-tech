package com.jtech.dto.request;

import com.jtech.entity.Question;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record QuestionGrammarUpdateRequest(
        @NotNull Question.QuestionType questionType,
        @NotBlank String content,
        String explanation,
        @NotBlank String answerData,
        @NotNull Question.Difficulty difficulty,
        @NotNull @Min(0) @Max(65535) Integer displayOrder
) {}
