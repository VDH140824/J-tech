package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.CoinTransactionRepository.CoinTransaction;
import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import com.jtech.repository.UserRewardBalanceRepository;
import com.jtech.repository.UserRewardBalanceRepository.RewardBalances;
import com.jtech.service.CoinRewardService.ActivityRef;
import com.jtech.service.CoinRewardService.RewardAllocation;
import com.jtech.service.CoinRewardService.SourceType;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** CD-13: SRS NS-08. */
class CoinWalletSrsUnitTest {

    @Test
    void awardCoins() {
        var existingLedger = mock(CoinTransactionRepository.class);
        var existingBalances = mock(UserRewardBalanceRepository.class);
        var existingService = new CoinRewardService(existingLedger, existingBalances);
        var activity = new ActivityRef(SourceType.PRACTICE, 7L);
        var reward = new RewardAllocation(10L, 5L);
        var original = new CoinTransaction(1L, 4L, "EARN", 10L, 30L, "PRACTICE", 7L, "award-key");
        when(existingLedger.findByAwardKey("award-key")).thenReturn(Optional.of(original));

        assertEquals(original, existingService.awardCoins(4L, activity, reward, "award-key"));
        verify(existingBalances, never()).creditCoinsAndExp(anyLong(), anyLong(), anyLong());

        var ledger = mock(CoinTransactionRepository.class);
        var balances = mock(UserRewardBalanceRepository.class);
        var service = new CoinRewardService(ledger, balances);
        var transactions = new HashMap<String, CoinTransaction>();
        when(balances.creditCoinsAndExp(4L, 10L, 5L)).thenReturn(new RewardBalances(30L, 5L));
        when(ledger.findByAwardKey(anyString())).thenAnswer(call ->
            Optional.ofNullable(transactions.get(call.getArgument(0, String.class)))
        );
        when(ledger.saveEarn(eq(4L), eq("PRACTICE"), eq(7L), eq(10L), eq(30L), anyString())).thenAnswer(call -> {
            var key = call.getArgument(5, String.class);
            var transaction = new CoinTransaction(1L, 4L, "EARN", 10L, 30L, "PRACTICE", 7L, key);
            transactions.put(key, transaction);
            return transaction;
        });

        var first = service.awardCoins(4L, activity, reward, "same-award");
        var second = service.awardCoins(4L, activity, reward, "same-award");

        assertEquals(first, second);
        assertEquals(1, transactions.size());
        verify(balances, times(1)).creditCoinsAndExp(4L, 10L, 5L);

        var milestoneLedger = mock(CoinTransactionRepository.class);
        var milestoneBalances = mock(UserRewardBalanceRepository.class);
        var configured = mock(StreakMilestoneRepository.class);
        var milestoneTransactions = new HashMap<String, CoinTransaction>();
        when(configured.findConfiguredMilestonesForAward()).thenReturn(List.of(new Milestone(5L, 3, 10L, true)));
        when(milestoneBalances.creditCoinsAndExp(4L, 10L, 0L)).thenReturn(new RewardBalances(30L, 0L));
        when(milestoneLedger.findByAwardKey(anyString())).thenAnswer(call ->
            Optional.ofNullable(milestoneTransactions.get(call.getArgument(0, String.class)))
        );
        when(milestoneLedger.saveEarn(eq(4L), eq("STREAK"), eq(5L), eq(10L), eq(30L), anyString()))
            .thenAnswer(call -> {
                var key = call.getArgument(5, String.class);
                var transaction = new CoinTransaction(1L, 4L, "EARN", 10L, 30L, "STREAK", 5L, key);
                milestoneTransactions.put(key, transaction);
                return transaction;
            });
        var awards = new StreakMilestoneService(configured, new CoinRewardService(milestoneLedger, milestoneBalances));
        var streak = new StreakService.State(3, 3, LocalDate.of(2026, 11, 5));

        awards.awardReachedMilestone(4L, streak);
        awards.awardReachedMilestone(4L, streak);

        verify(milestoneBalances, times(1)).creditCoinsAndExp(4L, 10L, 0L);
        assertEquals(1, milestoneTransactions.size());
    }
}
