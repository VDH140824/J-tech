package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.CoinTransactionRepository.CoinTransaction;
import com.jtech.repository.UserRewardBalanceRepository;
import com.jtech.service.CoinRewardService.ActivityRef;
import com.jtech.service.CoinRewardService.RewardAllocation;
import com.jtech.service.CoinRewardService.SourceType;
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
}
