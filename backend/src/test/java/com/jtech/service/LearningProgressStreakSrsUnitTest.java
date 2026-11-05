package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

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

}
