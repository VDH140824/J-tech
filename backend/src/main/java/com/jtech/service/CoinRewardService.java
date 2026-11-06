package com.jtech.service;

import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.CoinTransactionRepository.CoinTransaction;
import com.jtech.repository.UserRewardBalanceRepository;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CoinRewardService {

    public enum SourceType {
        TEST,
        PRACTICE,
        GAME,
        STREAK,
    }

    public record ActivityRef(SourceType type, long id) {}

    public record RewardAllocation(long coinAmount, long expAmount) {}

    private final CoinTransactionRepository transactions;
    private final UserRewardBalanceRepository balances;

    public CoinRewardService(
        CoinTransactionRepository transactions,
        UserRewardBalanceRepository balances
    ) {
        this.transactions = transactions;
        this.balances = balances;
    }

    // The calling activity supplies its configured allocation and stable award key.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public CoinTransaction awardCoins(
        long studentId,
        ActivityRef activityRef,
        RewardAllocation allocation,
        String awardKey
    ) {
        if (
            studentId <= 0 ||
            activityRef == null ||
            activityRef.type() == null ||
            activityRef.id() <= 0 ||
            awardKey == null ||
            awardKey.isBlank() ||
            awardKey.length() > 120 ||
            allocation == null ||
            allocation.coinAmount() < 0 ||
            allocation.expAmount() < 0
        ) {
            throw new IllegalArgumentException("Thông tin cấp thưởng không hợp lệ.");
        }

        // The store uses the same account row lock when spending coins.
        balances.lockAccount(studentId);
        var existing = transactions.findByAwardKey(awardKey);
        String sourceType = activityRef.type().name();
        if (existing.isPresent()) {
            var award = existing.get();
            if (
                award.studentId() != studentId ||
                !"EARN".equals(award.direction()) ||
                !sourceType.equals(award.sourceType()) ||
                !Objects.equals(award.sourceId(), activityRef.id())
            ) {
                throw new IllegalArgumentException(
                    "Mã cấp thưởng đã được dùng cho hoạt động khác."
                );
            }
            return award;
        }

        var updated = balances.creditCoinsAndExp(
            studentId,
            allocation.coinAmount(),
            allocation.expAmount()
        );
        return transactions.saveEarn(
            studentId,
            sourceType,
            activityRef.id(),
            allocation.coinAmount(),
            updated.coinBalance(),
            awardKey
        );
    }
}
