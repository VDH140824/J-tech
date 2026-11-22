package com.jtech.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Phản hồi của trang "Đọc hiểu AI". Đáp án đúng chỉ trả về sau khi nộp bài. */
public final class AiReadingResponses {
    private AiReadingResponses() {}

    public record Question(int index, String content, Map<String, String> options) {}

    public record QuestionResult(int index, String selected, String correctAnswer, boolean correct, String explanation) {}

    public record Result(int total, int correct, BigDecimal score, BigDecimal passingScore, boolean passed,
        long coinsAwarded, String translationVi, List<QuestionResult> results) {}

    /** chapterNo/lessonId null khi bài được tạo cho cả môn; result null khi chưa nộp. */
    public record Detail(Long id, String title, String passageJp, Long courseId, String courseName, Long chapterId,
        Integer chapterNo, Long lessonId, String status, List<Question> questions, LocalDateTime createdAt,
        Result result) {}

    public record HistoryItem(Long id, String title, String courseName, Integer chapterNo, String status,
        int totalQuestions, int correctCount, long coinsAwarded, LocalDateTime createdAt, LocalDateTime submittedAt) {}

    public record Page(List<HistoryItem> items, int page, int size, long total) {}
}
