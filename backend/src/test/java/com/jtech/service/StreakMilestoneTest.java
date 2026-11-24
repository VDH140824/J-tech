package com.jtech.service;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import com.jtech.service.CoinRewardService.ActivityRef;
import com.jtech.service.CoinRewardService.SourceType;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class StreakMilestoneTest {

    @Test
    void awardReachedMilestone() {
        var unreachedMilestones = mock(StreakMilestoneRepository.class);
        var unreachedCoins = mock(CoinRewardService.class);
        when(unreachedMilestones.findConfiguredMilestonesForAward()).thenReturn(List.of(new Milestone(5L, 3, 10L, true)));

        new StreakMilestoneService(unreachedMilestones, unreachedCoins).awardReachedMilestone(
            4L, new StreakService.State(2, 2, LocalDate.of(2026, 11, 5))
        );
        verifyNoInteractions(unreachedCoins);

        var reachedMilestones = mock(StreakMilestoneRepository.class);
        var reachedCoins = mock(CoinRewardService.class);
        when(reachedMilestones.findConfiguredMilestonesForAward()).thenReturn(List.of(
            new Milestone(5L, 3, 10L, true), new Milestone(6L, 7, 25L, true)
        ));

        new StreakMilestoneService(reachedMilestones, reachedCoins).awardReachedMilestone(
            4L, new StreakService.State(3, 3, LocalDate.of(2026, 11, 5))
        );
        verify(reachedCoins).awardCoins(eq(4L), eq(new ActivityRef(SourceType.STREAK, 5L)),
            argThat(allocation -> allocation.coinAmount() == 10L), anyString());
    }
}
