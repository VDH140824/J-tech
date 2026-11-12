package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.dto.response.VocabularyMiniTestResponse.Result;
import com.jtech.repository.LearningProgressRepository;
import com.jtech.repository.LearningProgressRepository.ContentType;
import com.jtech.repository.UserRewardBalanceRepository;
import com.jtech.repository.UserStreakRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LearningActivityStreakSrsUnitTest {
    private static final long STUDENT_ID = 4L;
    private final LearningProgressRepository progress = mock(LearningProgressRepository.class);
    private final UserStreakRepository days = mock(UserStreakRepository.class);
    private final StreakMilestoneService milestones = mock(StreakMilestoneService.class);
    private final LearningActivityService activity = new LearningActivityService(
        progress, days, mock(UserRewardBalanceRepository.class), milestones);
    private final LocalDate today = LocalDate.now(StreakService.LEARNING_ZONE);

    // BR112: the first qualifying completion adds one learning day.
    @Test
    void contentCompletionAddsFirstLearningDay() {
        when(progress.isPublished(ContentType.VOCABULARY, 7L)).thenReturn(true);
        when(days.findLearningDays(STUDENT_ID)).thenReturn(List.of(today));

        var result = activity.recordContentCompletion(STUDENT_ID, ContentType.VOCABULARY, 7L);

        assertEquals(new LearningActivityService.CompletionResult(true, 1, 1), result);
        verify(days).updateStreak(STUDENT_ID, 1, 1, today);
    }

    // BR112: reviewing the same content on another calendar day still qualifies.
    @Test
    void reviewingPreviouslyCompletedContentQualifiesOnNewDay() {
        // Fixture: the student completed vocabulary item 7 yesterday and reviews it today.
        when(progress.isPublished(ContentType.VOCABULARY, 7L)).thenReturn(true);
        when(days.findLearningDays(STUDENT_ID)).thenReturn(List.of(today.minusDays(1), today));

        var result = activity.recordContentCompletion(STUDENT_ID, ContentType.VOCABULARY, 7L);

        assertEquals(new LearningActivityService.CompletionResult(true, 2, 2), result);
        verify(days).updateStreak(STUDENT_ID, 2, 2, today);
    }

    // BR112: a recorded attempt is assigned to its original completion date.
    @Test
    void practiceUsesOriginalCompletionTimeRatherThanRequestDate() {
        var submitted = today.minusDays(1).atTime(23, 59);
        when(progress.findCompletedPractice(STUDENT_ID, 8L)).thenReturn(submitted);
        when(days.findLearningDays(STUDENT_ID)).thenReturn(List.of(submitted.toLocalDate()));

        var result = activity.recordPracticeCompletion(STUDENT_ID, 8L);

        assertEquals(new LearningActivityService.CompletionResult(true, 1, 1), result);
        verify(days).saveCompletedSession(STUDENT_ID, "PRACTICE", "practice_attempt_id", 8L, submitted);
        verify(days).updateStreak(STUDENT_ID, 1, 1, submitted.toLocalDate());
    }

    // BR112: another completion on an already qualified day does not extend the streak.
    @Test
    void anotherPracticeAttemptOnQualifiedDayDoesNotIncreaseStreak() {
        var submitted = today.atTime(0, 1);
        when(progress.findCompletedPractice(STUDENT_ID, 8L)).thenReturn(submitted);
        when(days.hasQualifiedDay(STUDENT_ID, today)).thenReturn(true);
        when(days.findLearningDays(STUDENT_ID)).thenReturn(List.of(today.minusDays(1), today));

        var result = activity.recordPracticeCompletion(STUDENT_ID, 8L);

        assertEquals(new LearningActivityService.CompletionResult(false, 2, 2), result);
        verify(days, never()).updateStreak(anyLong(), anyInt(), anyInt(), any());
        verifyNoInteractions(milestones);
    }

    // BR74, BR112: timestamps on either side of local midnight belong to different days.
    @Test
    void practicesOnEitherSideOfMidnightQualifyOnSeparateDays() {
        var beforeMidnight = today.minusDays(1).atTime(23, 59);
        var afterMidnight = today.atTime(0, 1);
        when(progress.findCompletedPractice(STUDENT_ID, 8L)).thenReturn(beforeMidnight);
        when(progress.findCompletedPractice(STUDENT_ID, 9L)).thenReturn(afterMidnight);
        when(days.findLearningDays(STUDENT_ID))
            .thenReturn(List.of(today.minusDays(1)))
            .thenReturn(List.of(today.minusDays(1), today));

        var first = activity.recordPracticeCompletion(STUDENT_ID, 8L);
        var second = activity.recordPracticeCompletion(STUDENT_ID, 9L);

        assertEquals(new LearningActivityService.CompletionResult(true, 1, 1), first);
        assertEquals(new LearningActivityService.CompletionResult(true, 2, 2), second);
        verify(days).updateStreak(STUDENT_ID, 1, 1, today.minusDays(1));
        verify(days).updateStreak(STUDENT_ID, 2, 2, today);
    }

    // UC-26, BR112: a completed exercise qualifies, but later exercises on that day do not add days.
    @Test
    void completedExercisesQualifyOnlyOnceOnSameDay() {
        var graded = new Result(new BigDecimal("100"), 1, 1, true, List.of());
        var answers = Map.of("1", "A");
        when(progress.saveVocabularyExerciseAttempt(eq(STUDENT_ID), eq(7L), eq(3L),
            eq(graded), eq(answers), any(LocalDateTime.class))).thenReturn(8L, 9L);
        when(days.hasQualifiedDay(STUDENT_ID, today)).thenReturn(false, true);
        when(days.findLearningDays(STUDENT_ID)).thenReturn(List.of(today));

        var first = activity.recordExerciseCompletion(STUDENT_ID, 7L, 3L, graded, answers);
        var second = activity.recordExerciseCompletion(STUDENT_ID, 7L, 3L, graded, answers);

        assertEquals(new LearningActivityService.CompletionResult(true, 1, 1), first);
        assertEquals(new LearningActivityService.CompletionResult(false, 1, 1), second);
        verify(days, times(1)).updateStreak(STUDENT_ID, 1, 1, today);
    }
}
