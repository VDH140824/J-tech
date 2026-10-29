package com.jtech.dto.response;
import com.jtech.entity.VocabularyMiniTest;
import com.jtech.entity.VocabularyMiniTestQuestion;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record VocabularyMiniTestResponse(Long id, Long lessonId, Long chapterId, String title, String description,
        Integer durationMinutes, BigDecimal passingScore, VocabularyMiniTest.Status status,
        long questionCount, long attemptCount, List<Question> questions) {
    public record Question(Long id, VocabularyMiniTestQuestion.Type questionType, String content, String explanation,
            VocabularyMiniTestQuestion.Difficulty difficulty, List<String> options, String correctAnswer, Map<String, String> matches,
            Long sourceVocabularyId) {}
    public record QuestionResult(Long questionId, boolean correct, String correctAnswer, Map<String, String> matches, String explanation) {}
    public record Result(BigDecimal score, int correctCount, int totalQuestions, boolean passed, List<QuestionResult> questions) {}
}
