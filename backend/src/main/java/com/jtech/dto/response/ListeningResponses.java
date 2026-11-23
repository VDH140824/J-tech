package com.jtech.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Trang "Nghe hiểu" của học viên. Đáp án đúng và bản dịch chỉ trả về sau khi nộp bài. */
public final class ListeningResponses {
    private ListeningResponses() {}

    public record LessonItem(Long lessonId, String title, Long courseId, String courseName, Integer chapterNo,
        boolean completed) {}

    public record Question(Long id, String content, Map<String, String> options) {}

    public record Detail(Long lessonId, Long exerciseId, String title, Long courseId, String courseName,
        Integer chapterNo, String audioUrl, String scriptJp, boolean completed, List<Question> questions) {}

    public record QuestionResult(Long questionId, String selected, String correctAnswer, boolean correct,
        String explanation) {}

    public record Result(int total, int correct, BigDecimal score, BigDecimal passingScore, boolean passed,
        long coinsAwarded, boolean completed, List<QuestionResult> results, String scriptVi) {}
}
