package com.jtech.service;

import com.jtech.campus.CampusQuizSessionStore.Session;
import com.jtech.service.CoinRewardService.ActivityRef;
import com.jtech.service.CoinRewardService.RewardAllocation;
import com.jtech.service.CoinRewardService.SourceType;
import org.springframework.stereotype.Service;

@Service
public class CampusQuizRewardService {
    private static final long COIN_REWARD = 100;
    private final CoinRewardService coins;

    public CampusQuizRewardService(CoinRewardService coins) {
        this.coins = coins;
    }

    public long awardCoins(Session session) {
        var transaction = coins.awardCoins(
            session.studentId(),
            new ActivityRef(SourceType.GAME, session.courseId()),
            new RewardAllocation(COIN_REWARD, 0),
            "CAMPUS_QUIZ:" + session.studentId() + ":" + session.id()
        );
        return transaction.amount();
    }
}
