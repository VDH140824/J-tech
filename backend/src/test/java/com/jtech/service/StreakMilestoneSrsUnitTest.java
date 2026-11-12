package com.jtech.service;

import static org.mockito.Mockito.*;

import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import com.jtech.service.CoinRewardService.ActivityRef;
import com.jtech.service.CoinRewardService.RewardAllocation;
import com.jtech.service.CoinRewardService.SourceType;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class StreakMilestoneSrsUnitTest {
    private static final long STUDENT_ID = 4L;
    private final StreakMilestoneRepository milestones = mock(StreakMilestoneRepository.class);
    private final CoinRewardService coins = mock(CoinRewardService.class);
    private final StreakMilestoneService awards = new StreakMilestoneService(milestones, coins);
    private final LocalDate streakStart = LocalDate.of(2026, 11, 5);

    // BR45, BR73: no coin reward before the configured milestone is reached.
    @Test
    void doesNotRequestRewardBeforeMilestoneIsReached() {
        when(milestones.findConfiguredMilestonesForAward())
            .thenReturn(List.of(new Milestone(5L, 3, 10L, true)));

        awards.awardReachedMilestone(STUDENT_ID, new StreakService.State(2, 2, streakStart));

        verifyNoInteractions(coins);
    }

    // BR73: the award amount comes from the reached milestone configuration.
    @Test
    void requestsConfiguredCoinsForReachedMilestone() {
        when(milestones.findConfiguredMilestonesForAward()).thenReturn(List.of(
            new Milestone(5L, 3, 10L, true), new Milestone(6L, 7, 25L, true)));

        awards.awardReachedMilestone(STUDENT_ID, new StreakService.State(3, 3, streakStart));

        verify(coins).awardCoins(eq(STUDENT_ID), eq(new ActivityRef(SourceType.STREAK, 5L)),
            argThat(allocation -> allocation.coinAmount() == 10L), anyString());
        verifyNoMoreInteractions(coins);
    }
}
