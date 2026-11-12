package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import com.jtech.repository.UserStreakRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class LearningProgressStreakSrsUnitTest {

    private final LocalDate today = LocalDate.of(2026, 11, 5);

    @Test
    void consecutiveLearningDaysCountAsOneStreak() {
        var start = today.minusDays(2);
        var actual = StreakService.calculate(List.of(today, start, today.minusDays(1)), today);
        assertEquals(new StreakService.State(3, 3, start), actual);
    }

    @Test
    void repeatedActivityOnSameDayDoesNotIncreaseStreak() {
        var actual = StreakService.calculate(List.of(today, today), today);
        assertEquals(new StreakService.State(1, 1, today), actual);
    }

    @Test
    void missedDayResetsCurrentStreakButPreservesLongest() {
        var actual = StreakService.calculate(List.of(today.minusDays(3), today.minusDays(2)), today);
        assertEquals(new StreakService.State(0, 2, null), actual);
    }

    // BR74: today is still open when the preceding calendar day qualified.
    @Test
    void streakRemainsCurrentWhenYesterdayWasTheLastLearningDay() {
        var yesterday = today.minusDays(1);
        var start = today.minusDays(2);

        var actual = StreakService.calculate(List.of(start, yesterday), today);

        assertEquals(new StreakService.State(2, 2, start), actual);
    }

    // BR43, BR108: a new run can be shorter than the historical best.
    @Test
    void reportsCurrentAndLongestRunsSeparately() {
        var dates = List.of(today.minusDays(7), today.minusDays(6), today.minusDays(5),
            today.minusDays(4), today.minusDays(1), today);

        assertEquals(new StreakService.State(2, 4, today.minusDays(1)),
            StreakService.calculate(dates, today));
    }

    // UC-27, BR73, BR108, BR109: report the next configured milestone without updating the streak.
    @Test
    void summaryReturnsNextMilestoneAndDoesNotWriteStreak() {
        long studentId = 4L;
        var day = LocalDate.now(StreakService.LEARNING_ZONE);
        var days = mock(UserStreakRepository.class);
        var milestones = mock(StreakMilestoneRepository.class);
        var reached = new Milestone(1L, 2, 5L, true);
        var next = new Milestone(2L, 3, 10L, true);
        var later = new Milestone(3L, 7, 25L, true);
        when(days.findLearningDays(studentId)).thenReturn(List.of(day.minusDays(1), day));
        when(days.findLongest(studentId)).thenReturn(5);
        when(milestones.findConfiguredMilestones()).thenReturn(List.of(reached, next, later));

        var summary = new StreakService(days, milestones).getStreakSummary(studentId);

        assertEquals(2, summary.currentStreak());
        assertEquals(5, summary.longestStreak());
        assertEquals(next, summary.nextMilestone());
        verify(days).findLearningDays(studentId);
        verify(days).findLongest(studentId);
        verify(milestones).findConfiguredMilestones();
        verifyNoMoreInteractions(days, milestones);
    }

    // UC-27 A1: the current and longest streak remain available without a next milestone.
    @Test
    void summaryHasNoNextMilestoneWhenHighestMilestoneWasReached() {
        long studentId = 4L;
        var day = LocalDate.now(StreakService.LEARNING_ZONE);
        var days = mock(UserStreakRepository.class);
        var milestones = mock(StreakMilestoneRepository.class);
        when(days.findLearningDays(studentId)).thenReturn(List.of(day.minusDays(1), day));
        when(days.findLongest(studentId)).thenReturn(4);
        when(milestones.findConfiguredMilestones()).thenReturn(List.of(new Milestone(1L, 2, 5L, true)));

        var summary = new StreakService(days, milestones).getStreakSummary(studentId);

        assertEquals(2, summary.currentStreak());
        assertEquals(4, summary.longestStreak());
        assertNull(summary.nextMilestone());
    }

}
