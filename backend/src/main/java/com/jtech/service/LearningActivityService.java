package com.jtech.service;

import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.repository.*;
import com.jtech.repository.LearningProgressRepository.ContentType;
import java.time.*;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LearningActivityService {
    public record CompletionResult(boolean learningDayAdded, int currentStreak, int longestStreak) {}
    private final LearningProgressRepository progress;
    private final UserStreakRepository days;
    private final UserRewardBalanceRepository balances;
    private final StreakMilestoneService milestones;
    public LearningActivityService(LearningProgressRepository progress, UserStreakRepository days,
            UserRewardBalanceRepository balances, StreakMilestoneService milestones) {
        this.progress = progress; this.days = days; this.balances = balances; this.milestones = milestones;
    }

    @Transactional
    public CompletionResult recordContentCompletion(long studentId, ContentType type, long contentId) {
        if (type == null || contentId <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nội dung không hợp lệ.");
        balances.lockAccount(studentId);
        if (!progress.isPublished(type, contentId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Nội dung không còn được xuất bản.");
        LocalDateTime time = LocalDateTime.now(StreakService.LEARNING_ZONE);
        progress.saveFirstCompletion(studentId, type, contentId, time);
        return recordDay(studentId, time, type.name(), type.name().toLowerCase(java.util.Locale.ROOT) + "_id", contentId);
    }

    // Use the persisted, server-graded attempt; clients cannot supply scores or completion dates.
    // Calling again retains that attempt and its original submission time.
    @Transactional
    public CompletionResult recordPracticeCompletion(long studentId, long attemptId) {
        balances.lockAccount(studentId);
        LocalDateTime submitted = progress.findCompletedPractice(studentId, attemptId);
        if (submitted == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lượt luyện tập đã hoàn thành của bạn.");
        return recordDay(studentId, submitted, "PRACTICE", "practice_attempt_id", attemptId);
    }

    @Transactional
    public CompletionResult recordKanjiTestCompletion(long studentId, long attemptId, LocalDateTime submitted) {
        balances.lockAccount(studentId);
        return recordDay(studentId, submitted, "TEST", "test_attempt_id", attemptId);
    }

    /** Bài đọc AI đã được chấm ở server; caller giữ khóa reading_session trong cùng transaction. */
    @Transactional
    public CompletionResult recordReadingCompletion(long studentId, long sessionId, LocalDateTime submitted) {
        balances.lockAccount(studentId);
        return recordDay(studentId, submitted, "READING", "reading_session_id", sessionId);
    }

    @Transactional
    public CompletionResult recordGameCompletion(long studentId, String sessionId, LocalDateTime completed) {
        balances.lockAccount(studentId);
        return recordStandaloneDay(studentId, completed, "GAME", sessionId);
    }

    @Transactional
    public CompletionResult recordExerciseCompletion(long studentId, long exerciseId, long lessonId,
            VocabularyTestResponse.Result result, Map<String, String> answers) {
        balances.lockAccount(studentId);
        LocalDateTime submitted = LocalDateTime.now(StreakService.LEARNING_ZONE);
        long attemptId = progress.saveVocabularyExerciseAttempt(studentId, exerciseId, lessonId, result, answers, submitted);
        return recordDay(studentId, submitted, "PRACTICE", "practice_attempt_id", attemptId);
    }
    public record ExerciseRecord(long attemptId, CompletionResult streak) {}
    /** UC-23: hoàn thành một lượt luyện tập thể chia → lưu practice_attempt và ghi nhận ngày học. */
    @Transactional
    public ExerciseRecord recordConjugationPracticeCompletion(long studentId, long formId, int verbGroup,
            String difficulty, String mode, int totalQuestions, int correctCount, java.math.BigDecimal score, Map<String, String> answers) {
        balances.lockAccount(studentId);
        LocalDateTime submitted = LocalDateTime.now(StreakService.LEARNING_ZONE);
        long attemptId = progress.saveConjugationAttempt(studentId, formId, verbGroup, difficulty, mode,
            totalQuestions, correctCount, score, answers, submitted);
        return new ExerciseRecord(attemptId, recordDay(studentId, submitted, "PRACTICE", "practice_attempt_id", attemptId));
    }

    private CompletionResult recordDay(long studentId, LocalDateTime time, String type, String referenceColumn, long referenceId) {
        LocalDate today = LocalDate.now(StreakService.LEARNING_ZONE);
        if (time.toLocalDate().isAfter(today)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Thời điểm hoàn thành không hợp lệ.");
        boolean added = !days.hasQualifiedDay(studentId, time.toLocalDate());
        days.saveCompletedSession(studentId, type, referenceColumn, referenceId, time);
        var allDays = days.findLearningDays(studentId);
        var state = StreakService.calculate(allDays, today);
        if (added) {
            days.updateStreak(studentId, state.currentStreak(), state.longestStreak(), time.toLocalDate());
            milestones.awardReachedMilestone(studentId, StreakService.calculate(allDays, time.toLocalDate()));
        }
        return new CompletionResult(added, state.currentStreak(), Math.max(state.longestStreak(), days.findLongest(studentId)));
    }

    private CompletionResult recordStandaloneDay(long studentId, LocalDateTime time, String type, String activityKey) {
        LocalDate today = LocalDate.now(StreakService.LEARNING_ZONE);
        if (time.toLocalDate().isAfter(today)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Thời điểm hoàn thành không hợp lệ.");
        boolean added = !days.hasQualifiedDay(studentId, time.toLocalDate());
        days.saveCompletedStandaloneSession(studentId, type, activityKey, time);
        var allDays = days.findLearningDays(studentId);
        var state = StreakService.calculate(allDays, today);
        if (added) {
            days.updateStreak(studentId, state.currentStreak(), state.longestStreak(), time.toLocalDate());
            milestones.awardReachedMilestone(studentId, StreakService.calculate(allDays, time.toLocalDate()));
        }
        return new CompletionResult(added, state.currentStreak(), Math.max(state.longestStreak(), days.findLongest(studentId)));
    }
}
