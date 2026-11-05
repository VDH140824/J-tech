package com.jtech.dto.response;

import com.jtech.entity.VocabularyMiniTestQuestion;
import java.math.BigDecimal;
import java.util.List;

public record StudentVocabularyExercise(
    Long id,
    String title,
    String description,
    int durationMinutes,
    BigDecimal passingScore,
    List<Question> questions
) {
    public record Question(
        Long id,
        VocabularyMiniTestQuestion.Type questionType,
        String content,
        List<String> options,
        List<String> matchingPrompts,
        List<String> matchingOptions
    ) {}
}
