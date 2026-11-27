package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.dto.response.VocabularyTestResponse.Result;
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

class LearningActivityStreakTest {

    private static final long STUDENT_ID = 4L;
    private final LocalDate today = LocalDate.now(StreakService.LEARNING_ZONE);

    private record Fixture(
        LearningProgressRepository progress,
        UserStreakRepository days,
        StreakMilestoneService milestones,
        LearningActivityService activity
    ) {}

    private Fixture fixture() {
        var progress = mock(LearningProgressRepository.class);
        var days = mock(UserStreakRepository.class);
        var milestones = mock(StreakMilestoneService.class);
        return new Fixture(progress, days, milestones, new LearningActivityService(
            progress, days, mock(UserRewardBalanceRepository.class), milestones
        ));
    }

    @Test
    void recordContentCompletion() {
        var first = fixture();
        when(first.progress().isPublished(ContentType.VOCABULARY, 7L)).thenReturn(true);
        when(first.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(today));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            first.activity().recordContentCompletion(STUDENT_ID, ContentType.VOCABULARY, 7L));
        verify(first.days()).updateStreak(STUDENT_ID, 0, 0, today);

        var review = fixture();
        when(review.progress().isPublished(ContentType.VOCABULARY, 7L)).thenReturn(true);
        when(review.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(today.minusDays(1), today));

        assertEquals(new LearningActivityService.CompletionResult(true, 2, 2),
            review.activity().recordContentCompletion(STUDENT_ID, ContentType.VOCABULARY, 7L));
        verify(review.days()).updateStreak(STUDENT_ID, 2, 2, today);
    }

    @Test
    void recordContentCompletionActual() {
        var f = fixture();
        when(f.progress().isPublished(ContentType.VOCABULARY, 7L)).thenReturn(true);
        when(f.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(today));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            f.activity().recordContentCompletion(STUDENT_ID, ContentType.VOCABULARY, 7L));
        verify(f.days()).updateStreak(STUDENT_ID, 0, 0, today);
    }

    @Test
    void recordPracticeCompletion() {
        var dated = fixture();
        var submitted = today.minusDays(1).atTime(23, 59);
        when(dated.progress().findCompletedPractice(STUDENT_ID, 8L)).thenReturn(submitted);
        when(dated.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(submitted.toLocalDate()));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            dated.activity().recordPracticeCompletion(STUDENT_ID, 8L));
        verify(dated.days()).saveCompletedSession(STUDENT_ID, "PRACTICE", "practice_attempt_id", 8L, submitted);
        verify(dated.days()).updateStreak(STUDENT_ID, 0, 0, submitted.toLocalDate());

        var sameDay = fixture();
        when(sameDay.progress().findCompletedPractice(STUDENT_ID, 8L)).thenReturn(today.atTime(0, 1));
        when(sameDay.days().hasQualifiedDay(STUDENT_ID, today)).thenReturn(true);
        when(sameDay.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(today.minusDays(1), today));

        assertEquals(new LearningActivityService.CompletionResult(false, 2, 2),
            sameDay.activity().recordPracticeCompletion(STUDENT_ID, 8L));
        verify(sameDay.days(), never()).updateStreak(anyLong(), anyInt(), anyInt(), any());

        var midnight = fixture();
        var beforeMidnight = today.minusDays(1).atTime(23, 59);
        var afterMidnight = today.atTime(0, 1);
        when(midnight.progress().findCompletedPractice(STUDENT_ID, 8L)).thenReturn(beforeMidnight);
        when(midnight.progress().findCompletedPractice(STUDENT_ID, 9L)).thenReturn(afterMidnight);
        when(midnight.days().findLearningDays(STUDENT_ID))
            .thenReturn(List.of(today.minusDays(1)))
            .thenReturn(List.of(today.minusDays(1), today));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            midnight.activity().recordPracticeCompletion(STUDENT_ID, 8L));
        assertEquals(new LearningActivityService.CompletionResult(true, 2, 2),
            midnight.activity().recordPracticeCompletion(STUDENT_ID, 9L));
    }

    @Test
    void recordPracticeCompletionActual() {
        var f = fixture();
        var submitted = today.minusDays(1).atTime(23, 59);
        when(f.progress().findCompletedPractice(STUDENT_ID, 8L)).thenReturn(submitted);
        when(f.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(submitted.toLocalDate()));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            f.activity().recordPracticeCompletion(STUDENT_ID, 8L));
        verify(f.days()).saveCompletedSession(STUDENT_ID, "PRACTICE", "practice_attempt_id", 8L, submitted);
        verify(f.days()).updateStreak(STUDENT_ID, 0, 0, submitted.toLocalDate());
    }

    @Test
    void recordExerciseCompletion() {
        var f = fixture();
        var graded = new Result(new BigDecimal("100"), 1, 1, true, List.of());
        var answers = Map.of("1", "A");
        when(f.progress().saveVocabularyExerciseAttempt(eq(STUDENT_ID), eq(7L), eq(3L),
            eq(graded), eq(answers), any(LocalDateTime.class))).thenReturn(8L, 9L);
        when(f.days().hasQualifiedDay(STUDENT_ID, today)).thenReturn(false, true);
        when(f.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(today));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            f.activity().recordExerciseCompletion(STUDENT_ID, 7L, 3L, graded, answers));
        assertEquals(new LearningActivityService.CompletionResult(false, 0, 0),
            f.activity().recordExerciseCompletion(STUDENT_ID, 7L, 3L, graded, answers));
        verify(f.days(), times(1)).updateStreak(STUDENT_ID, 0, 0, today);
    }

    @Test
    void recordExerciseCompletionActual() {
        var f = fixture();
        var graded = new Result(new BigDecimal("100"), 1, 1, true, List.of());
        var answers = Map.of("1", "A");
        when(f.progress().saveVocabularyExerciseAttempt(eq(STUDENT_ID), eq(7L), eq(3L),
            eq(graded), eq(answers), any(LocalDateTime.class))).thenReturn(8L);
        when(f.days().findLearningDays(STUDENT_ID)).thenReturn(List.of(today));

        assertEquals(new LearningActivityService.CompletionResult(true, 0, 0),
            f.activity().recordExerciseCompletion(STUDENT_ID, 7L, 3L, graded, answers));
        verify(f.days()).updateStreak(STUDENT_ID, 0, 0, today);
    }
}
