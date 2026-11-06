package com.jtech.service;

import com.jtech.repository.StreakMilestoneRepository;
import org.springframework.stereotype.Service;

@Service
public class StreakMilestoneService {
    private final StreakMilestoneRepository milestones;
    private final CoinRewardService coins;
    public StreakMilestoneService(StreakMilestoneRepository milestones, CoinRewardService coins) {
        this.milestones = milestones;
        this.coins = coins;
    }

    // Called only inside the completion transaction, with the account locked.
    public void awardReachedMilestone(long studentId, StreakService.State streak) {
        for (var milestone : milestones.findConfiguredMilestonesForAward()) {
            if (milestone.targetDays() != streak.currentStreak()) continue;
            coins.awardCoins(studentId,
                new CoinRewardService.ActivityRef(CoinRewardService.SourceType.STREAK, milestone.id()),
                new CoinRewardService.RewardAllocation(milestone.coinAmount(), 0),
                "streak:" + studentId + ":" + streak.streakStart() + ":" + milestone.id());
        }
    }
}
