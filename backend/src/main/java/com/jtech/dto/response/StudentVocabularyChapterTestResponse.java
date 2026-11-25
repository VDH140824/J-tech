package com.jtech.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Student-facing chapter vocabulary test, saved attempts, and result review. */
public final class StudentVocabularyChapterTestResponse {

    private StudentVocabularyChapterTestResponse() {}

    public record Test(
        Long id,
        Long chapterId,
        String title,
        String description,
        int durationMinutes,
        BigDecimal passingScore,
        List<Question> questions,
        Long inProgressAttemptId,
        List<AttemptSummary> attempts
    ) {}

    public record Question(
        Long id,
        String questionType,
        String content,
        List<String> options
    ) {}

    public record AttemptSummary(
        Long id,
        int attemptNo,
        String status,
        BigDecimal score,
        int correctCount,
        int totalQuestions,
        Boolean passed,
        LocalDateTime submittedAt
    ) {}

    public record Attempt(
        Long id,
        Long testId,
        Long chapterId,
        String title,
        int attemptNo,
        String status,
        int durationMinutes,
        BigDecimal passingScore,
        LocalDateTime startedAt,
        LocalDateTime deadlineAt,
        long remainingSeconds,
        List<Question> questions,
        Map<String, String> answers
    ) {}

    public record Result(
        Long id,
        Long testId,
        Long chapterId,
        String title,
        int attemptNo,
        String status,
        BigDecimal score,
        int correctCount,
        int totalQuestions,
        BigDecimal passingScore,
        boolean passed,
        long timeSpentSec,
        LocalDateTime submittedAt,
        List<QuestionResult> questions
    ) {}

    public record QuestionResult(
        Long questionId,
        String questionType,
        String content,
        List<String> options,
        String yourAnswer,
        String correctAnswer,
        boolean correct,
        String explanation
    ) {}
}
