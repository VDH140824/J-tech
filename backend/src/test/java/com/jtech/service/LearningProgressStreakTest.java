package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import com.jtech.repository.UserStreakRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class LearningProgressStreakTest {

    private final LocalDate today = LocalDate.of(2026, 11, 5);

    @Test
    void calculate() {
        var start = today.minusDays(2);
        assertAll(
            () -> assertEquals(new StreakService.State(3, 3, start),
            StreakService.calculate(List.of(today, start, today.minusDays(1)), today)),
            () -> assertEquals(new StreakService.State(0, 0, null),
            StreakService.calculate(List.of(today, today), today)),
            () -> assertEquals(new StreakService.State(0, 2, null),
            StreakService.calculate(List.of(today.minusDays(3), today.minusDays(2)), today)),
            () -> assertEquals(new StreakService.State(2, 2, today.minusDays(2)),
            StreakService.calculate(List.of(today.minusDays(2), today.minusDays(1)), today)),
            () -> assertEquals(new StreakService.State(2, 4, today.minusDays(1)),
            StreakService.calculate(List.of(today.minusDays(7), today.minusDays(6), today.minusDays(5),
                today.minusDays(4), today.minusDays(1), today), today))
        );
    }

    @Test
    void calculateActual() {
        assertEquals(new StreakService.State(0, 0, null),
            StreakService.calculate(List.of(today, today), today));
    }

    @Test
    void getStreakSummary() {
        long studentId = 4L;
        var currentDay = LocalDate.now(StreakService.LEARNING_ZONE);
        var days = mock(UserStreakRepository.class);
        var milestones = mock(StreakMilestoneRepository.class);
        var reached = new Milestone(1L, 2, 5L, true);
        var next = new Milestone(2L, 3, 10L, true);
        when(days.findLearningDays(studentId)).thenReturn(List.of(currentDay.minusDays(1), currentDay));
        when(days.findLongest(studentId)).thenReturn(5);
        when(milestones.findConfiguredMilestones()).thenReturn(List.of(reached, next));

        var summary = new StreakService(days, milestones).getStreakSummary(studentId);

        assertAll(
            () -> assertEquals(2, summary.currentStreak()),
            () -> assertEquals(5, summary.longestStreak()),
            () -> assertEquals(next, summary.nextMilestone())
        );

        var noNextDays = mock(UserStreakRepository.class);
        var noNextMilestones = mock(StreakMilestoneRepository.class);
        when(noNextDays.findLearningDays(studentId)).thenReturn(List.of(currentDay.minusDays(1), currentDay));
        when(noNextDays.findLongest(studentId)).thenReturn(4);
        when(noNextMilestones.findConfiguredMilestones()).thenReturn(List.of(new Milestone(1L, 2, 5L, true)));

        var noNext = new StreakService(noNextDays, noNextMilestones).getStreakSummary(studentId);
        assertNull(noNext.nextMilestone());
    }
}
