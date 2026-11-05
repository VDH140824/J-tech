package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.repository.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

class RewardStoreServiceTest {

    JdbcTemplate db;
    StoreItemRepository items;
    UserInventoryRepository inventory;
    StoreService service;

    @BeforeEach
    void setup() {
        db = mock(JdbcTemplate.class);
        items = mock(StoreItemRepository.class);
        inventory = mock(UserInventoryRepository.class);
        service = new StoreService(db, mock(UserRepository.class), items, inventory);
        when(db.queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(100);
        when(items.findDetailById(2L, true)).thenReturn(
            new HashMap<>(Map.of("id", 2L, "name", "Khung", "coin_price", 80, "status", "ACTIVE"))
        );
    }

    @Test
    void rejectsInsufficientBalanceWithoutWrites() {
        when(db.queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(20);
        assertThrows(ResponseStatusException.class, () -> service.redeem(1, 2, 80, "request"));
        verify(db, never()).update(anyString(), any(Object[].class));
    }

    // UC-30 / BR143: balance equal to price is sufficient.
    @Test
    void redeemsItemWhenBalanceEqualsPrice() {
        when(db.queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(80);
        when(db.queryForObject(anyString(), eq(Long.class), eq("store:1:request"))).thenReturn(3L);

        var result = service.redeem(1, 2, 80, "request");

        assertEquals(0, result.get("balance"));
    }

    @Test
    void changedPriceNeedsNewConfirmation() {
        assertThrows(ResponseStatusException.class, () -> service.redeem(1, 2, 70, "request"));
        verify(db, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void existingOwnershipCannotBeGrantedAgain() {
        when(inventory.owns(1, 2)).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.redeem(1, 2, 80, "request"));
        verify(db, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void retryReturnsOriginalOutcomeWithoutDebit() {
        var outcome = Map.<String, Object>of(
            "reference",
            3L,
            "itemId",
            2L,
            "amount",
            80,
            "balance",
            20
        );
        when(db.queryForList(anyString(), eq("store:1:request"), eq(1L))).thenReturn(
            List.of(outcome)
        );
        assertEquals(outcome, service.redeem(1, 2, 80, "request"));
        verifyNoInteractions(items, inventory);
        verify(db, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void successfulExchangeDebitsAndGrants() {
        when(db.queryForObject(anyString(), eq(Long.class), eq("store:1:request"))).thenReturn(3L);
        assertEquals(20, service.redeem(1, 2, 80, "request").get("balance"));
        verify(db).update("UPDATE user_account SET coin_balance=? WHERE id=?", 20, 1L);
        verify(db).update(
            "INSERT INTO user_inventory(user_id,store_item_id,coin_transaction_id) VALUES(?,?,?)",
            1L,
            2L,
            3L
        );
    }

    @Test
    void rejectsEquipmentForUnownedItem() {
        assertThrows(AccessDeniedException.class, () -> service.equipment(1, 2, true));
    }

    @Test
    void unavailableBalanceStillReturnsCatalog() {
        when(db.queryForObject(anyString(), eq(Integer.class), eq(1L))).thenThrow(
            new org.springframework.dao.DataAccessResourceFailureException("offline")
        );
        when(items.findPublishedItems(1)).thenReturn(List.of(Map.of("id", 2, "owned", true)));
        var result = service.catalog(1);
        assertNull(result.get("balance"));
        assertEquals(1, ((List<?>) result.get("items")).size());
    }

    @Test
    void inventoryFailureIsNotAnEmptyInventory() {
        when(inventory.findOwnedItemsAndEquipment(1)).thenThrow(
            new org.springframework.dao.DataAccessResourceFailureException("offline")
        );
        assertThrows(org.springframework.dao.DataAccessException.class, () -> service.inventory(1));
    }

    @Test
    void materialWithoutEntitlementIsDenied() {
        assertThrows(AccessDeniedException.class, () -> service.material(1, 2));
    }
}
