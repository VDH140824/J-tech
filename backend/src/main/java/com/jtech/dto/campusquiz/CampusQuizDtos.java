package com.jtech.dto.campusquiz;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CampusQuizDtos {
    public static final int QUESTION_COUNT = 50;

    private CampusQuizDtos() {}

    public record CourseSummary(long id, String code, String name) {}

    public record StartRequest(@NotNull @Positive Long courseId) {}

    public record Option(int id, String text) {}

    public record QuizQuestion(long id, String content, String mediaUrl, List<Option> options) {}

    public record StartResponse(UUID sessionId, Instant serverTime, Instant expiresAt, List<QuizQuestion> questions) {}

    public record Answer(@NotNull @Positive Long questionId, @NotNull @Positive Integer optionId) {}

    public enum SubmissionMode { MANUAL, TIMEOUT }

    public record SubmitRequest(
        @NotNull UUID sessionId,
        @NotNull @Size(max = QUESTION_COUNT) List<@NotNull @Valid Answer> answers,
        SubmissionMode mode
    ) {}

    public record QuestionResult(long questionId, Integer selectedOptionId, int correctOptionId, String explanation) {}

    public record QuizResult(
        UUID sessionId,
        int correctCount,
        int totalCount,
        boolean passed,
        long coinAwarded,
        boolean prayerEligible,
        List<QuestionResult> questionResults
    ) {}

    public record QuizError(String code, String message, Integer availableCount) {}
}
