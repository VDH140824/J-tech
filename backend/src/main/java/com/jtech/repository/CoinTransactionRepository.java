package com.jtech.repository;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CoinTransactionRepository {

    public record CoinTransaction(
        long id,
        long studentId,
        String direction,
        long amount,
        long balanceAfter,
        String sourceType,
        Long sourceId,
        String awardKey
    ) {}

    private final JdbcTemplate db;

    public CoinTransactionRepository(JdbcTemplate db) {
        this.db = db;
    }

    public Optional<CoinTransaction> findByAwardKey(String awardKey) {
        return db
            .query(
                """
                SELECT id, user_id, direction, amount, balance_after, source_type, source_ref_id, award_key
                FROM coin_transaction WHERE award_key = ?
                """,
                (rs, row) ->
                    new CoinTransaction(
                        rs.getLong("id"),
                        rs.getLong("user_id"),
                        rs.getString("direction"),
                        rs.getLong("amount"),
                        rs.getLong("balance_after"),
                        rs.getString("source_type"),
                        rs.getObject("source_ref_id", Long.class),
                        rs.getString("award_key")
                    ),
                awardKey
            )
            .stream()
            .findFirst();
    }

    public CoinTransaction saveEarn(
        long studentId,
        String sourceType,
        long sourceId,
        long amount,
        long balanceAfter,
        String awardKey
    ) {
        db.update(
            """
            INSERT INTO coin_transaction
                (user_id, direction, amount, balance_after, source_type, source_ref_id, award_key)
            VALUES (?, 'EARN', ?, ?, ?, ?, ?)
            """,
            studentId,
            amount,
            balanceAfter,
            sourceType,
            sourceId,
            awardKey
        );
        return findByAwardKey(awardKey).orElseThrow();
    }
}
