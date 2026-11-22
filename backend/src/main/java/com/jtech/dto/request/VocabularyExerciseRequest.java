package com.jtech.dto.request;

import com.jtech.entity.VocabularyTest;
import com.jtech.entity.VocabularyTestQuestion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record VocabularyExerciseRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 10000) String description,
    @NotNull @Min(5) @Max(30) Integer durationMinutes,
    @NotNull
    @DecimalMin("0")
    @DecimalMax("100")
    @Digits(integer = 3, fraction = 2)
    BigDecimal passingScore,
    @NotNull VocabularyTest.Status status,
    @NotNull
    @Size(min = 1, message = "Exercise phải có câu hỏi từ danh sách từ vựng của bài.")
    List<@NotNull @Valid Question> questions
) {
    public record Question(
        @NotNull VocabularyTestQuestion.Type questionType,
        @NotBlank @Size(max = 10000) String content,
        @Size(max = 10000) String explanation,
        @NotNull VocabularyTestQuestion.Difficulty difficulty,
        @Size(max = 6) List<@NotBlank @Size(max = 1000) String> options,
        @Size(max = 1000) String correctAnswer,
        @Size(max = 10)
        Map<@NotBlank @Size(max = 1000) String, @NotBlank @Size(max = 1000) String> matches,
        Long sourceVocabularyId
    ) {
        public Question(
            VocabularyTestQuestion.Type type,
            String content,
            String explanation,
            VocabularyTestQuestion.Difficulty difficulty,
            List<String> options,
            String answer,
            Map<String, String> matches
        ) {
            this(type, content, explanation, difficulty, options, answer, matches, null);
        }
    }
}
