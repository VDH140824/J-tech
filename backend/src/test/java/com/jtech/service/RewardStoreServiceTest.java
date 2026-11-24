package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.repository.StoreItemRepository;
import com.jtech.repository.UserInventoryRepository;
import com.jtech.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

class RewardStoreServiceTest {

    private record Fixture(
        JdbcTemplate db,
        StoreItemRepository items,
        UserInventoryRepository inventory,
        StoreService service
    ) {}

    private Fixture fixture() {
        var db = mock(JdbcTemplate.class);
        var items = mock(StoreItemRepository.class);
        var inventory = mock(UserInventoryRepository.class);
        when(db.queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(100);
        when(items.findDetailById(2L, true)).thenReturn(
            new HashMap<>(Map.of("id", 2L, "name", "Khung", "coin_price", 80, "status", "ACTIVE"))
        );
        return new Fixture(db, items, inventory, new StoreService(db, mock(UserRepository.class), items, inventory));
    }

    @Test
    void redeem() {
        var insufficient = fixture();
        when(insufficient.db().queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(20);
        assertThrows(ResponseStatusException.class, () -> insufficient.service().redeem(1, 2, 80, "request"));
        verify(insufficient.db(), never()).update(anyString(), any(Object[].class));

        var exactBalance = fixture();
        when(exactBalance.db().queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(80);
        when(exactBalance.db().queryForObject(anyString(), eq(Long.class), eq("store:1:request"))).thenReturn(3L);
        assertEquals(0, exactBalance.service().redeem(1, 2, 80, "request").get("balance"));

        var priceChanged = fixture();
        assertThrows(ResponseStatusException.class, () -> priceChanged.service().redeem(1, 2, 70, "request"));
        verify(priceChanged.db(), never()).update(anyString(), any(Object[].class));

        var alreadyOwned = fixture();
        when(alreadyOwned.inventory().owns(1, 2)).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> alreadyOwned.service().redeem(1, 2, 80, "request"));
        verify(alreadyOwned.db(), never()).update(anyString(), any(Object[].class));

        var retry = fixture();
        var outcome = Map.<String, Object>of("reference", 3L, "itemId", 2L, "amount", 80, "balance", 20);
        when(retry.db().queryForList(anyString(), eq("store:1:request"), eq(1L))).thenReturn(List.of(outcome));
        assertEquals(outcome, retry.service().redeem(1, 2, 80, "request"));
        verifyNoInteractions(retry.items(), retry.inventory());

        var success = fixture();
        when(success.db().queryForObject(anyString(), eq(Long.class), eq("store:1:request"))).thenReturn(3L);
        assertEquals(20, success.service().redeem(1, 2, 80, "request").get("balance"));
        verify(success.db()).update("UPDATE user_account SET coin_balance=? WHERE id=?", 20, 1L);
        verify(success.db()).update(
            "INSERT INTO user_inventory(user_id,store_item_id,coin_transaction_id) VALUES(?,?,?)", 1L, 2L, 3L
        );
    }

    @Test
    void equipment() {
        var f = fixture();
        assertThrows(AccessDeniedException.class, () -> f.service().equipment(1, 2, true));
    }

    @Test
    void catalog() {
        var f = fixture();
        when(f.db().queryForObject(anyString(), eq(Integer.class), eq(1L))).thenThrow(
            new org.springframework.dao.DataAccessResourceFailureException("offline")
        );
        when(f.items().findPublishedItems(1)).thenReturn(List.of(Map.of("id", 2, "owned", true)));
        var result = f.service().catalog(1);
        assertNull(result.get("balance"));
        assertEquals(1, ((List<?>) result.get("items")).size());
    }

    @Test
    void inventory() {
        var f = fixture();
        when(f.inventory().findOwnedItemsAndEquipment(1)).thenThrow(
            new org.springframework.dao.DataAccessResourceFailureException("offline")
        );
        assertThrows(org.springframework.dao.DataAccessException.class, () -> f.service().inventory(1));
    }

    @Test
    void material() {
        var f = fixture();
        assertThrows(AccessDeniedException.class, () -> f.service().material(1, 2));
    }
}
