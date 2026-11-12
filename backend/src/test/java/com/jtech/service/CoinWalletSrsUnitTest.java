package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.CoinTransactionRepository.CoinTransaction;
import com.jtech.repository.UserRewardBalanceRepository;
import com.jtech.repository.UserRewardBalanceRepository.RewardBalances;
import com.jtech.repository.StreakMilestoneRepository;
import com.jtech.repository.StreakMilestoneRepository.Milestone;
import com.jtech.service.CoinRewardService.ActivityRef;
import com.jtech.service.CoinRewardService.RewardAllocation;
import com.jtech.service.CoinRewardService.SourceType;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CoinWalletSrsUnitTest {

    private final CoinTransactionRepository ledger = mock(CoinTransactionRepository.class);
    private final UserRewardBalanceRepository balances = mock(UserRewardBalanceRepository.class);
    private final CoinRewardService service = new CoinRewardService(ledger, balances);
    private final ActivityRef activity = new ActivityRef(SourceType.PRACTICE, 7L);
    private final RewardAllocation reward = new RewardAllocation(10L, 5L);

    @Test
    void repeatedAwardReturnsOriginalTransaction() {
        var original = new CoinTransaction(1L, 4L, "EARN", 10L, 30L, "PRACTICE", 7L, "award-key");
        when(ledger.findByAwardKey("award-key")).thenReturn(Optional.of(original));

        var actual = service.awardCoins(4L, activity, reward, "award-key");

        assertEquals(original, actual);
        verify(balances, never())
            .creditCoinsAndExp(anyLong(),
                anyLong(), anyLong());
    }

    // BR45, NS-08: retrying the same milestone in an unbroken streak credits coins once.
    @Test
    void sameMilestoneInSameStreakCreditsCoinsOnlyOnce() {
        long studentId = 4L;
        var configured = mock(StreakMilestoneRepository.class);
        when(configured.findConfiguredMilestonesForAward())
            .thenReturn(List.of(new Milestone(5L, 3, 10L, true)));
        when(balances.creditCoinsAndExp(studentId, 10L, 0L)).thenReturn(new RewardBalances(30L, 0L));
        Map<String, CoinTransaction> transactions = new HashMap<>();
        when(ledger.findByAwardKey(anyString()))
            .thenAnswer(call -> Optional.ofNullable(transactions.get(call.getArgument(0, String.class))));
        when(ledger.saveEarn(eq(studentId), eq("STREAK"), eq(5L), eq(10L), eq(30L), anyString()))
            .thenAnswer(call -> {
                String awardKey = call.getArgument(5);
                var transaction = new CoinTransaction(1L, studentId, "EARN", 10L, 30L, "STREAK", 5L, awardKey);
                transactions.put(awardKey, transaction);
                return transaction;
            });
        var awards = new StreakMilestoneService(configured, service);
        var streak = new StreakService.State(3, 3, LocalDate.of(2026, 11, 5));

        awards.awardReachedMilestone(studentId, streak);
        awards.awardReachedMilestone(studentId, streak);

        verify(balances).creditCoinsAndExp(studentId, 10L, 0L);
        assertEquals(1, transactions.size());
    }
}
