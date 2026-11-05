package com.jtech.service;

import com.jtech.entity.*;
import com.jtech.repository.*;
import java.security.Principal;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StoreService {

    private final JdbcTemplate db;
    private final UserRepository users;
    private final StoreItemRepository items;
    private final UserInventoryRepository inventory;

    public StoreService(
        JdbcTemplate db,
        UserRepository users,
        StoreItemRepository items,
        UserInventoryRepository inventory
    ) {
        this.db = db;
        this.users = users;
        this.items = items;
        this.inventory = inventory;
    }

    public long requireStudent(Principal principal) {
        if (principal == null) throw new AccessDeniedException("Bạn cần đăng nhập.");
        User u = users
            .findByEmail(principal.getName())
            .orElseThrow(() -> new AccessDeniedException("Không tìm thấy tài khoản."));
        if (
            u.getStatus() != UserStatus.ACTIVE ||
            u.getRole() == null ||
            !"STUDENT".equals(u.getRole().getRoleName())
        ) throw new AccessDeniedException("Chức năng dành cho học viên đang hoạt động.");
        return u.getUserId();
    }

    private int balance(long userId, boolean lock) {
        return db.queryForObject(
            "SELECT coin_balance FROM user_account WHERE id=?" + (lock ? " FOR UPDATE" : ""),
            Integer.class,
            userId
        );
    }

    public Map<String, Object> catalog(long userId) {
        var catalog = items.findPublishedItems(userId);
        Map<String, Object> result = new HashMap<>();
        result.put("items", catalog);
        try {
            result.put("balance", balance(userId, false));
        } catch (org.springframework.dao.DataAccessException e) {
            result.put("balance", null);
        }
        return result;
    }

    public Map<String, Object> detail(long userId, long itemId) {
        var item = new HashMap<>(items.findDetailById(itemId, false));
        if (
            !"ACTIVE".equals(item.get("status")) && !inventory.owns(userId, itemId)
        ) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Vật phẩm không còn được mở bán."
        );
        item.put("owned", inventory.owns(userId, itemId));
        try {
            item.put("balance", balance(userId, false));
        } catch (org.springframework.dao.DataAccessException e) {
            item.put("balance", null);
        }
        return item;
    }

    @Transactional
    public Map<String, Object> redeem(
        long userId,
        long itemId,
        int expectedPrice,
        String requestId
    ) {
        int currentBalance = balance(userId, true); // Serializes every exchange/equipment change for this student.
        String key = "store:" + userId + ":" + requestId;
        var prior = db.queryForList(
            "SELECT id AS reference, source_ref_id AS itemId, amount, balance_after AS balance FROM coin_transaction WHERE award_key=? AND user_id=?",
            key,
            userId
        );
        if (!prior.isEmpty()) {
            if (
                ((Number) prior.getFirst().get("itemId")).longValue() != itemId
            ) throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Mã yêu cầu đã được dùng cho vật phẩm khác."
            );
            return prior.getFirst();
        }
        var item = items.findDetailById(itemId, true);
        int price = ((Number) item.get("coin_price")).intValue();
        if (!"ACTIVE".equals(item.get("status"))) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Vật phẩm không còn được mở bán."
        );
        if (price != expectedPrice) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Giá vật phẩm đã thay đổi. Vui lòng xem lại và xác nhận giá mới."
        );
        if (inventory.owns(userId, itemId)) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Bạn đã sở hữu vật phẩm này."
        );
        if (currentBalance < price) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Bạn chưa đủ xu để đổi vật phẩm này."
        );
        int remaining = currentBalance - price;
        db.update("UPDATE user_account SET coin_balance=? WHERE id=?", remaining, userId);
        db.update(
            "INSERT INTO coin_transaction(user_id,direction,amount,balance_after,source_type,source_ref_id,award_key,description) VALUES(?,'SPEND',?,?,'STORE',?,?,?)",
            userId,
            price,
            remaining,
            itemId,
            key,
            "Đổi vật phẩm: " + item.get("name")
        );
        long reference = db.queryForObject(
            "SELECT id FROM coin_transaction WHERE award_key=?",
            Long.class,
            key
        );
        db.update(
            "INSERT INTO user_inventory(user_id,store_item_id,coin_transaction_id) VALUES(?,?,?)",
            userId,
            itemId,
            reference
        );
        return Map.of(
            "reference",
            reference,
            "itemId",
            itemId,
            "amount",
            price,
            "balance",
            remaining
        );
    }

    public Map<String, Object> material(long userId, long itemId) {
        var rows = db.queryForList(
            "SELECT s.material_url FROM user_inventory i JOIN store_item s ON s.id=i.store_item_id WHERE i.user_id=? AND i.store_item_id=? AND s.item_type='MATERIAL' AND (i.usable_until IS NULL OR i.usable_until>CURRENT_TIMESTAMP)",
            userId,
            itemId
        );
        if (
            rows.isEmpty() || rows.getFirst().get("material_url") == null
        ) throw new AccessDeniedException(
            "Bạn không có quyền truy cập tài liệu hoặc quyền sử dụng đã hết hạn."
        );
        return Map.of("url", rows.getFirst().get("material_url"));
    }

    public List<Map<String, Object>> inventory(long userId) {
        return inventory.findOwnedItemsAndEquipment(userId);
    }

    @Transactional
    public List<Map<String, Object>> equipment(long userId, long itemId, boolean equipped) {
        balance(userId, true);
        if (!inventory.owns(userId, itemId)) throw new AccessDeniedException(
            "Bạn chưa sở hữu vật phẩm này."
        );
        var item = items.findDetailById(itemId, false);
        if (
            equipped &&
            db
                .queryForList(
                    "SELECT * FROM user_inventory WHERE user_id=? AND store_item_id=?",
                    userId,
                    itemId
                )
                .stream()
                .noneMatch(row -> {
                    Object expiry = row.get("usable_until");
                    return (
                        expiry == null ||
                        (expiry instanceof java.time.LocalDateTime date &&
                            date.isAfter(java.time.LocalDateTime.now())) ||
                        (expiry instanceof java.sql.Timestamp timestamp &&
                            timestamp.toInstant().isAfter(java.time.Instant.now()))
                    );
                })
        ) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Quyền sử dụng vật phẩm đã hết hạn."
        );
        if (
            !Set.of("BADGE", "AVATAR_FRAME", "THEME", "AVATAR").contains(item.get("item_type"))
        ) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Vật phẩm này không hỗ trợ trang bị."
        );
        if (equipped) db.update(
            "UPDATE user_inventory i JOIN store_item s ON s.id=i.store_item_id SET i.is_equipped=FALSE WHERE i.user_id=? AND s.item_type=?",
            userId,
            item.get("item_type")
        );
        db.update(
            "UPDATE user_inventory SET is_equipped=? WHERE user_id=? AND store_item_id=?",
            equipped,
            userId,
            itemId
        );
        return inventory(userId);
    }
}
