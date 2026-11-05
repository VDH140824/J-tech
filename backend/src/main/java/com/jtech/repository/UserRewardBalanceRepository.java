package com.jtech.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRewardBalanceRepository {

    public record RewardBalances(long coinBalance, long expBalance) {}

    private final JdbcTemplate db;

    public UserRewardBalanceRepository(JdbcTemplate db) {
        this.db = db;
    }

    public void lockAccount(long studentId) {
        db.queryForObject(
            "SELECT id FROM user_account WHERE id = ? FOR UPDATE",
            Long.class,
            studentId
        );
    }

    public RewardBalances creditCoinsAndExp(long studentId, long coins, long exp) {
        db.update(
            """
            UPDATE user_account SET coin_balance = coin_balance + ?, exp_balance = exp_balance + ?
            WHERE id = ?
            """,
            coins,
            exp,
            studentId
        );
        return db.queryForObject(
            "SELECT coin_balance, exp_balance FROM user_account WHERE id = ?",
            (rs, row) -> new RewardBalances(rs.getLong("coin_balance"), rs.getLong("exp_balance")),
            studentId
        );
    }
}
