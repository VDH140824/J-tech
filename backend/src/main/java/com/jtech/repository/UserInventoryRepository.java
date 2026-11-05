package com.jtech.repository;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserInventoryRepository {

    private final JdbcTemplate db;

    public UserInventoryRepository(JdbcTemplate db) {
        this.db = db;
    }

    public List<Map<String, Object>> findOwnedItemsAndEquipment(long userId) {
        var rows = db.queryForList(
            "SELECT s.*, i.is_equipped, i.acquired_at FROM user_inventory i JOIN store_item s ON s.id=i.store_item_id WHERE i.user_id=? ORDER BY i.acquired_at DESC",
            userId
        );
        rows.forEach(row -> row.remove("material_url"));
        return rows;
    }

    public boolean owns(long userId, long itemId) {
        return (
            db.queryForObject(
                "SELECT COUNT(*) FROM user_inventory WHERE user_id=? AND store_item_id=?",
                Long.class,
                userId,
                itemId
            ) > 0
        );
    }
}
