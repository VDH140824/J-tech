package com.jtech.dto.request;

import com.jtech.entity.VocabularyMiniTest;
import com.jtech.entity.VocabularyMiniTestQuestion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record VocabularyMiniTestRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10000) String description,
        @NotNull @Min(5) @Max(30) Integer durationMinutes,
        @NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer = 3, fraction = 2) BigDecimal passingScore,
        @NotNull VocabularyMiniTest.Status status,
        @NotNull @Size(min = 1, message = "Mini-test phải có câu hỏi từ danh sách từ vựng của bài.") List<@NotNull @Valid Question> questions
) {
    public record Question(
            @NotNull VocabularyMiniTestQuestion.Type questionType,
            @NotBlank @Size(max = 10000) String content,
            @Size(max = 10000) String explanation,
            @NotNull VocabularyMiniTestQuestion.Difficulty difficulty,
            @Size(max = 6) List<@NotBlank @Size(max = 1000) String> options,
            @Size(max = 1000) String correctAnswer,
            @Size(max = 10) Map<@NotBlank @Size(max = 1000) String, @NotBlank @Size(max = 1000) String> matches,
            Long sourceVocabularyId
    ) {
        public Question(VocabularyMiniTestQuestion.Type type, String content, String explanation,
                VocabularyMiniTestQuestion.Difficulty difficulty, List<String> options, String answer, Map<String, String> matches) {
            this(type, content, explanation, difficulty, options, answer, matches, null);
        }
    }
}
