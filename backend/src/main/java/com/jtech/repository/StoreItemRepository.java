package com.jtech.repository;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StoreItemRepository {

    private final JdbcTemplate db;

    public StoreItemRepository(JdbcTemplate db) {
        this.db = db;
    }

    public List<Map<String, Object>> findPublishedItems(long userId) {
        var rows = db.queryForList(
            """
            SELECT s.*, EXISTS(
                SELECT 1 FROM user_inventory i WHERE i.user_id=? AND i.store_item_id=s.id
            ) AS owned
            FROM store_item s WHERE s.status='ACTIVE' ORDER BY s.item_type, s.id
            """, userId
        );
        rows.forEach(row -> row.remove("material_url"));
        return rows;
    }

    public Map<String, Object> findDetailById(long id, boolean lock) {
        var rows = db.queryForList(
            "SELECT * FROM store_item WHERE id = ?" + (lock ? " FOR UPDATE" : ""),
            id
        );
        if (rows.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND,
            "Không tìm thấy vật phẩm."
        );
        rows.getFirst().remove("material_url");
        return rows.getFirst();
    }
}
