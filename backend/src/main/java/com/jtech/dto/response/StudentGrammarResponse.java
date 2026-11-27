package com.jtech.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Màn Grammar của học viên: tài liệu, luyện tập, mini test và kết quả. */
public final class StudentGrammarResponse {

    private StudentGrammarResponse() {
    }

    /** Material Grammar: bài học + điểm ngữ pháp đã xuất bản + tình trạng luyện tập / mini test. */
    public record Lesson(
            Long id,
            Long chapterId,
            Integer chapterNo,
            String chapterTitle,
            String courseName,
            Integer lessonNo,
            String title,
            String description,
            List<GrammarPoint> grammars,
            int exerciseCount,
            MiniTestInfo miniTest,
            boolean completed,
            BigDecimal bestExerciseScore) {
    }

    public record GrammarPoint(
            Long id,
            String structureName,
            String meaningVi,
            String usageExplanation,
            String exampleJp,
            String exampleVi,
            String videoUrl,
            Integer videoDurationSec) {
    }

    /** Mini test đang xuất bản của bài học; null nếu chưa có. */
    public record MiniTestInfo(
            Long id,
            String title,
            int durationMinutes,
            BigDecimal passingScore,
            int questionCount,
            Long inProgressAttemptId,
            List<AttemptSummary> attempts) {
    }

    public record AttemptSummary(
            Long id,
            int attemptNo,
            String status,
            BigDecimal score,
            int correctCount,
            int totalQuestions,
            Boolean passed,
            LocalDateTime submittedAt) {
    }

    /** Câu hỏi gửi cho học viên — không kèm đáp án. MCQ: options (key, text); MATCHING: vế trái + vế phải đã xáo. */
    public record Question(
            Long id,
            String questionType,
            String content,
            String grammarName,
            List<Option> options,
            List<String> matchLeft,
            List<String> matchRight) {
    }

    public record Option(String key, String text) {
    }

    /** Grammar Exercise: các câu luyện tập của bài học. */
    public record Exercise(Long lessonId, List<Question> questions) {
    }

    /** Kết quả chấm từng câu (luyện tập và mini test). */
    public record QuestionResult(
            Long questionId,
            boolean correct,
            String yourAnswer,
            String correctAnswer,
            Map<String, String> matches,
            String explanation) {
    }

    public record CheckResult(int correctCount, int totalQuestions, BigDecimal score, List<QuestionResult> results) {
    }

    /**
     * Kết quả nộp bài tập ngữ pháp. lessonCompleted = bài đã được tính hoàn thành trong tiến độ;
     * firstCompletion = lần nộp này là lần đầu hoàn thành bài.
     */
    public record ExerciseResult(int correctCount, int totalQuestions, BigDecimal score,
                                 boolean lessonCompleted, boolean firstCompletion, BigDecimal bestScore,
                                 List<QuestionResult> results) {
    }

    /** Mini test Grammar: lượt làm đang diễn ra. */
    public record Attempt(
            Long id,
            Long testId,
            Long lessonId,
            String title,
            int attemptNo,
            String status,
            int durationMinutes,
            BigDecimal passingScore,
            LocalDateTime startedAt,
            LocalDateTime deadlineAt,
            long remainingSeconds,
            List<Question> questions,
            Map<String, String> answers) {
    }

    /** Mini test Grammar result. */
    public record AttemptResult(
            Long id,
            Long testId,
            Long lessonId,
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
            List<Question> questions,
            List<QuestionResult> results) {
    }
}
