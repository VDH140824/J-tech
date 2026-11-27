package com.jtech.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class TestManagementResponse {

    private TestManagementResponse() {
    }

    public record Summary(
            Long id,
            String testType,
            String skill,
            String status,
            String title,
            Long courseId,
            String courseName,
            Long chapterId,
            Integer chapterNo,
            String chapterTitle,
            Long lessonId,
            String lessonTitle,
            int questionCount,
            int durationMinutes,
            BigDecimal passingScore,
            long attemptCount,
            LocalDateTime updatedAt) {
    }

    public record Detail(
            Summary summary,
            String description,
            List<QuestionItem> questions,
            boolean locked) {
    }

    public record QuestionItem(
            Long id,
            String skill,
            String questionType,
            String difficulty,
            String status,
            boolean exerciseQuestion,
            String content,
            String answerData,
            Long lessonId,
            String lessonTitle,
            String lessonStatus,
            Long chapterId) {
    }

    public record Page(List<Summary> content, long totalElements, int totalPages, int page, int size) {
    }

    public record DeleteResult(Long id, boolean archived, String reason) {
    }
}
