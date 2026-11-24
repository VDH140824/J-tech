package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.jtech.entity.User;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

class RewardAdminServiceTest {

    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final FeedbackService access = mock(FeedbackService.class);
    private final Cloudinary cloud = mock(Cloudinary.class);
    private final Uploader uploader = mock(Uploader.class);
    private final RewardAdminService service = new RewardAdminService(db, access, cloud);
    private final Principal admin = () -> "admin@example.com";
    private final RewardAdminService.Item item = new RewardAdminService.Item(
        "BADGE", "  Scholar  ", "  Achievement badge  ", 80L, "ACTIVE"
    );

    @BeforeEach
    void setUp() {
        when(access.actor(admin, "ADMIN")).thenReturn(User.builder().userId(20L).build());
        when(cloud.uploader()).thenReturn(uploader);
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    @Test
    void saveItemCreate() throws Exception {
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
            "secure_url", "https://res.cloudinary.com/jtech/image/upload/badge.png",
            "public_id", "jtech/store/badge"
        ));
        var image = new MockMultipartFile("image", "badge.png", "image/png", new byte[] {1, 2});

        service.saveItem(admin, null, item, image);

        verify(uploader).upload(eq(new byte[] {1, 2}), argThat(options ->
            "jtech/store".equals(options.get("folder")) && "image".equals(options.get("resource_type"))
        ));
        verify(db).update(startsWith("INSERT INTO store_item"),
            eq("BADGE"), eq("Scholar"), eq("Achievement badge"),
            eq("https://res.cloudinary.com/jtech/image/upload/badge.png"),
            eq("jtech/store/badge"), eq(80L), eq("ACTIVE"), eq(20L), eq(20L));
        TransactionSynchronizationManager.getSynchronizations().forEach(sync ->
            sync.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));
        verify(uploader, never()).destroy(anyString(), anyMap());
    }

    @Test
    void saveItemUpdate() throws Exception {
        when(db.queryForList("SELECT * FROM store_item WHERE id=? FOR UPDATE", 5L)).thenReturn(List.of(Map.of(
            "item_type", "BADGE", "image_url", "https://example.test/old.png",
            "image_public_id", "jtech/store/old"
        )));

        service.saveItem(admin, 5L, item, null);

        verify(db).update(startsWith("UPDATE store_item SET"),
            eq("BADGE"), eq("Scholar"), eq("Achievement badge"),
            eq("https://example.test/old.png"), eq("jtech/store/old"),
            eq(80L), eq("ACTIVE"), eq(20L), eq(5L));
        verifyNoInteractions(uploader);
    }

    @Test
    void saveItemReplaceImage() throws Exception {
        when(db.queryForList("SELECT * FROM store_item WHERE id=? FOR UPDATE", 5L)).thenReturn(List.of(Map.of(
            "item_type", "BADGE", "image_url", "https://example.test/old.png",
            "image_public_id", "jtech/store/old"
        )));
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
            "secure_url", "https://example.test/new.png", "public_id", "jtech/store/new"
        ));

        service.saveItem(admin, 5L, item,
            new MockMultipartFile("image", "new.png", "image/png", new byte[] {1}));

        verify(db).update(startsWith("UPDATE store_item SET"),
            eq("BADGE"), eq("Scholar"), eq("Achievement badge"),
            eq("https://example.test/new.png"), eq("jtech/store/new"),
            eq(80L), eq("ACTIVE"), eq(20L), eq(5L));
    }

    @Test
    void saveItemRejectsInvalidInput() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> service.saveItem(admin, null, null, null));
        assertThrows(IllegalArgumentException.class, () -> service.saveItem(admin, null, item, null));
        assertThrows(IllegalArgumentException.class, () -> service.saveItem(admin, null, item,
            new MockMultipartFile("image", "badge.pdf", "application/pdf", new byte[] {1})));
        assertThrows(IllegalArgumentException.class, () -> service.saveItem(admin, null, item,
            new MockMultipartFile("image", "large.png", "image/png", new byte[3 * 1024 * 1024 + 1])));
        verifyNoInteractions(db, uploader);
    }

    @Test
    void saveItemRollback() throws Exception {
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of(
            "secure_url", "https://example.test/new.png", "public_id", "jtech/store/new"
        ));

        service.saveItem(admin, null, item,
            new MockMultipartFile("image", "new.png", "image/png", new byte[] {1}));
        TransactionSynchronizationManager.getSynchronizations().forEach(sync ->
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        verify(uploader).destroy(eq("jtech/store/new"), anyMap());
    }

    @Test
    void deleteItemHard() {
        when(db.queryForList("SELECT id FROM store_item WHERE id=? FOR UPDATE", 5L))
            .thenReturn(List.of(Map.of("id", 5L)));
        when(db.queryForObject("SELECT COUNT(*) FROM user_inventory WHERE store_item_id=?", Long.class, 5L))
            .thenReturn(0L);
        when(db.queryForObject("SELECT COUNT(*) FROM coin_transaction WHERE source_type='STORE' AND source_ref_id=?", Long.class, 5L))
            .thenReturn(0L);

        service.deleteItem(admin, 5L);

        verify(db).update("DELETE FROM store_item WHERE id=?", 5L);
        verifyNoInteractions(uploader);
    }

    @Test
    void deleteItemSoftOwned() {
        when(db.queryForList("SELECT id FROM store_item WHERE id=? FOR UPDATE", 5L))
            .thenReturn(List.of(Map.of("id", 5L)));
        when(db.queryForObject("SELECT COUNT(*) FROM user_inventory WHERE store_item_id=?", Long.class, 5L))
            .thenReturn(1L);

        service.deleteItem(admin, 5L);

        verify(db).update(startsWith("UPDATE store_item SET status='INACTIVE'"), eq(20L), eq(5L));
        verify(db, never()).update("DELETE FROM store_item WHERE id=?", 5L);
        verifyNoInteractions(uploader);
    }

    @Test
    void deleteItemSoftPurchased() {
        when(db.queryForList("SELECT id FROM store_item WHERE id=? FOR UPDATE", 5L))
            .thenReturn(List.of(Map.of("id", 5L)));
        when(db.queryForObject("SELECT COUNT(*) FROM user_inventory WHERE store_item_id=?", Long.class, 5L))
            .thenReturn(0L);
        when(db.queryForObject("SELECT COUNT(*) FROM coin_transaction WHERE source_type='STORE' AND source_ref_id=?", Long.class, 5L))
            .thenReturn(1L);

        service.deleteItem(admin, 5L);

        verify(db).update(startsWith("UPDATE store_item SET status='INACTIVE'"), eq(20L), eq(5L));
        verifyNoInteractions(uploader);
    }

    @Test
    void deleteItemMissing() {
        when(db.queryForList("SELECT id FROM store_item WHERE id=? FOR UPDATE", 999L))
            .thenReturn(List.of());

        var failure = assertThrows(ResponseStatusException.class, () -> service.deleteItem(admin, 999L));

        assertEquals(HttpStatus.NOT_FOUND, failure.getStatusCode());
        verify(db, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(uploader);
    }
}
