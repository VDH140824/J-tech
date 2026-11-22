package com.jtech.service;

import com.jtech.dto.request.CommentRequest;
import com.jtech.dto.request.UpdateCommentRequest;
import com.jtech.entity.ClassPostComment;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.repository.CommentRepository;
import com.jtech.repository.PostRepository;
import java.lang.reflect.Proxy;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.security.access.AccessDeniedException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class CommentServiceTest {
    private User actor = user("STUDENT", 10);
    private List<Object[]> rows = List.of();
    private ClassPostComment stored;
    private ClassPostComment savedComment;
    private int saveCalls;
    private RuntimeException saveFailure;
    private RuntimeException accessFailure;
    private boolean postExists = true;
    private int postLookupCalls;
    private int threadFetchCalls;
    private final AttachmentCloudinary cloudinary = new AttachmentCloudinary();
    private final PostService postService = new PostService(null, null, null, null, null, null) {
        @Override public User checkPostAccess(Long classId, boolean requireActive) {
            if (accessFailure != null) throw accessFailure;
            return actor;
        }
    };
    private final PostRepository posts = proxy(PostRepository.class, (method, args) -> {
        if (method.equals("existsByIdAndClassroomId")) {
            postLookupCalls++;
            return postExists;
        }
        throw new AssertionError("Unexpected post call: " + method);
    });
    private final CommentRepository comments = proxy(CommentRepository.class, (method, args) -> {
        if (method.equals("findThreadRows")) {
            threadFetchCalls++;
            return rows;
        }
        if (method.equals("findByIdAndPostId")) return Optional.ofNullable(stored);
        if (method.equals("saveAndFlush")) {
            saveCalls++;
            savedComment = (ClassPostComment) args[0];
            if (saveFailure != null) throw saveFailure;
            ((ClassPostComment) args[0]).setId(5L);
            return args[0];
        }
        throw new AssertionError("Unexpected comment call: " + method);
    });
    private final CommentService service = new CommentService(postService, posts, comments, cloudinary);

    private static class AttachmentCloudinary extends CloudinaryService {
        int uploads;
        int cleanups;
        int oldCleanups;
        boolean failOldCleanup;
        RuntimeException uploadFailure;
        AttachmentCloudinary() { super(null); }
        @Override public Map<String, String> uploadCommentAttachment(org.springframework.web.multipart.MultipartFile file) {
            uploads++;
            if (uploadFailure != null) throw uploadFailure;
            return Map.of("url", "https://res.cloudinary.com/demo/raw/upload/file.pdf",
                    "publicId", "Jtech/Classroom/Comment/file.pdf", "resourceType", "raw");
        }
        @Override public void deleteCommentAttachment(String id, String type) { cleanups++; }
        @Override public void deleteCommentAttachmentByUrl(String id, String url) {
            oldCleanups++;
            if (failOldCleanup) throw new IllegalStateException("Cloudinary cleanup failed");
        }
    }

    private interface Call { Object run(String method, Object[] args); }
    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, Call call) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] {type},
                (proxy, method, args) -> call.run(method.getName(), args));
    }
    private static User user(String role, long id) {
        Role userRole = new Role(); userRole.setRoleName(role);
        User user = new User(); user.setUserId(id); user.setRole(userRole);
        return user;
    }
    private static Object[] row(long id, Long parentId, String content, String audio) {
        return new Object[] {id, 2L, 10L, "Học viên", null, content, audio, parentId,
                Timestamp.valueOf(LocalDateTime.of(2026, 11, 11, 9, 0)), null};
    }

    @Test
    @DisplayName("UTCID01: Display a comment with text and an attachment")
    void getCommentsDisplaysTextAndAttachment() {
        String attachmentUrl = "https://res.cloudinary.com/demo/raw/upload/file.pdf";
        rows = List.<Object[]>of(row(1, null, "Nội dung bình luận", attachmentUrl));

        var result = service.getComments(1L, 2L);

        assertEquals(1, result.size());
        assertEquals(1L, result.get(0).id());
        assertEquals("Nội dung bình luận", result.get(0).content());
        assertEquals(attachmentUrl, result.get(0).attachmentUrl());
        assertFalse(result.get(0).deleted());
        assertEquals(1, threadFetchCalls);
    }

    @Test
    @DisplayName("UTCID02: Return an empty list when the post has no comments")
    void getCommentsReturnsEmptyList() {
        assertTrue(service.getComments(1L, 2L).isEmpty());
        assertEquals(1, threadFetchCalls);
    }

    @Test
    @DisplayName("UTCID03: Reject access before fetching comments")
    void getCommentsRejectsUnauthorizedAccess() {
        accessFailure = new AccessDeniedException("Bạn không thuộc lớp học này");

        var error = assertThrows(AccessDeniedException.class, () -> service.getComments(1L, 2L));

        assertSame(accessFailure, error);
        assertEquals(0, postLookupCalls);
        assertEquals(0, threadFetchCalls);
    }

    @Test
    @DisplayName("UTCID04: Reject a post that does not belong to the classroom")
    void getCommentsRejectsMissingPostInClassroom() {
        postExists = false;

        var error = assertThrows(EntityNotFoundException.class, () -> service.getComments(1L, 2L));

        assertEquals("Bài đăng không tồn tại.", error.getMessage());
        assertEquals(1, postLookupCalls);
        assertEquals(0, threadFetchCalls);
    }

    @Test
    @DisplayName("UTCID05: Display an attachment-only comment")
    void getCommentsDisplaysAttachmentOnly() {
        String attachmentUrl = "https://res.cloudinary.com/demo/raw/upload/audio.mp3";
        rows = List.<Object[]>of(row(1, null, null, attachmentUrl));

        var result = service.getComments(1L, 2L);

        assertEquals(1, result.size());
        assertNull(result.get(0).content());
        assertEquals(attachmentUrl, result.get(0).attachmentUrl());
        assertFalse(result.get(0).deleted());
    }

    @Test
    @DisplayName("UTCID06: Display a text-only comment")
    void getCommentsDisplaysTextOnly() {
        rows = List.<Object[]>of(row(1, null, "Chỉ có nội dung", null));

        var result = service.getComments(1L, 2L);

        assertEquals(1, result.size());
        assertEquals("Chỉ có nội dung", result.get(0).content());
        assertNull(result.get(0).attachmentUrl());
        assertFalse(result.get(0).deleted());
    }

    @Test
    @DisplayName("UTCID07: Student creates a text-only comment")
    void createTextOnlyCommentAsStudent() {
        rows = List.<Object[]>of(row(5, null, "Nội dung", null));

        var result = service.createComment(1L, 2L, new CommentRequest("  Nội dung  ", null), null);

        assertEquals(5L, result.id());
        assertEquals("Nội dung", result.content());
        assertEquals(2L, savedComment.getPostId());
        assertEquals(10L, savedComment.getUserId());
        assertEquals("Nội dung", savedComment.getContent());
        assertNull(savedComment.getAudioUrl());
        assertNull(savedComment.getParentId());
        assertEquals(0, cloudinary.uploads);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID08: Create a comment with text and an attachment")
    void createCommentWithTextAndAttachment() {
        String url = "https://res.cloudinary.com/demo/raw/upload/file.pdf";
        rows = List.<Object[]>of(row(5, null, "Nội dung", url));
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});

        var result = service.createComment(1L, 2L, new CommentRequest("Nội dung", null), file);

        assertEquals("Nội dung", result.content());
        assertEquals(url, result.attachmentUrl());
        assertEquals(url, savedComment.getAudioUrl());
        assertEquals("Jtech/Classroom/Comment/file.pdf", savedComment.getAudioPublicId());
        assertEquals(1, cloudinary.uploads);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID09: Create an attachment-only comment")
    void createAttachmentOnlyComment() {
        String url = "https://res.cloudinary.com/demo/raw/upload/file.pdf";
        rows = List.<Object[]>of(row(5, null, null, url));
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});

        var result = service.createComment(1L, 2L, new CommentRequest("", null), file);

        assertEquals(5L, result.id());
        assertNull(result.content());
        assertEquals(url, result.attachmentUrl());
        assertFalse(result.deleted());
        assertNull(savedComment.getContent());
        assertEquals(1, cloudinary.uploads);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID10: Moderator creates a comment")
    void createCommentAsModerator() {
        actor = user("MODERATOR", 5);
        rows = List.<Object[]>of(row(5, null, "Nội dung", null));

        var result = service.createComment(1L, 2L, new CommentRequest("Nội dung", null), null);

        assertEquals(5L, result.id());
        assertEquals(5L, savedComment.getUserId());
        assertEquals("Nội dung", savedComment.getContent());
        assertEquals(0, cloudinary.uploads);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID11: Reply to an existing comment")
    void createReplyToExistingComment() {
        stored = comment("Bình luận cha", null, null);
        stored.setId(3L);
        rows = List.<Object[]>of(row(5, 3L, "Trả lời", null));

        var result = service.createComment(1L, 2L, new CommentRequest("Trả lời", 3L), null);

        assertEquals(3L, savedComment.getParentId());
        assertEquals(3L, result.parentId());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID12: Reject blank text without an attachment")
    void createRejectsBlankContent() {
        var error = assertThrows(IllegalArgumentException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("   ", null), null));

        assertEquals("Nội dung bình luận không được để trống", error.getMessage());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID13: Reject a link without HTTP or HTTPS")
    void createRejectsUnsupportedLinkProtocol() {
        var error = assertThrows(IllegalArgumentException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("ftp://example.com/file", null), null));

        assertEquals("Liên kết chỉ được dùng HTTP hoặc HTTPS.", error.getMessage());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID14: Accept a comment containing exactly 200 characters")
    void createAcceptsExactlyTwoHundredCharacters() {
        String content = "a".repeat(200);
        rows = List.<Object[]>of(row(5, null, content, null));

        var result = service.createComment(1L, 2L, new CommentRequest(content, null), null);

        assertEquals(content, result.content());
        assertEquals(200, savedComment.getContent().length());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID15: Reject a comment containing 201 characters")
    void createRejectsTwoHundredAndOneCharacters() {
        var error = assertThrows(IllegalArgumentException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("a".repeat(201), null), null));

        assertEquals("Bình luận không được vượt quá 200 ký tự.", error.getMessage());
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID16: Reject users without permission to comment in the classroom")
    void createRejectsUnauthorizedAccess() {
        accessFailure = new AccessDeniedException("Bạn không thuộc lớp học này.");
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});

        var error = assertThrows(AccessDeniedException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("Nội dung", null), file));

        assertSame(accessFailure, error);
        assertEquals(0, postLookupCalls);
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID17: Reject a reply to a deleted parent comment")
    void createRejectsDeletedParentComment() {
        stored = comment(null, null, null);
        stored.setId(3L);

        var error = assertThrows(IllegalArgumentException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("Trả lời", 3L), null));

        assertEquals("Không thể trả lời bình luận đã xóa.", error.getMessage());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID18: Do not save when the attachment service rejects a file")
    void createRejectsInvalidAttachment() {
        var file = new MockMultipartFile("attachment", "invalid.exe", "application/octet-stream", new byte[]{1});
        cloudinary.uploadFailure = new IllegalArgumentException("Định dạng tệp không được hỗ trợ.");

        var error = assertThrows(IllegalArgumentException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("Nội dung", null), file));

        assertSame(cloudinary.uploadFailure, error);
        assertEquals(1, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID19: Do not save when attachment upload fails")
    void createStopsWhenAttachmentUploadFails() {
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});
        cloudinary.uploadFailure = new IllegalStateException("Cloudinary failed");

        var error = assertThrows(ResponseStatusException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("Nội dung", null), file));

        assertEquals(500, error.getStatusCode().value());
        assertSame(cloudinary.uploadFailure, error.getCause());
        assertEquals(1, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID20: Delete the uploaded file when saving the comment fails")
    void createCleansUploadedFileWhenSaveFails() {
        saveFailure = new IllegalStateException("database failed");
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});

        var error = assertThrows(IllegalStateException.class,
                () -> service.createComment(1L, 2L, new CommentRequest("Nội dung", null), file));

        assertSame(saveFailure, error);
        assertEquals(1, cloudinary.uploads);
        assertEquals(1, saveCalls);
        assertEquals(1, cloudinary.cleanups);
    }

    @Test
    @DisplayName("UTCID21: Delete the uploaded file when the transaction rolls back")
    void createCleansUploadedFileAfterRollback() {
        rows = List.<Object[]>of(row(5, null, "Nội dung",
                "https://res.cloudinary.com/demo/raw/upload/file.pdf"));
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.createComment(1L, 2L, new CommentRequest("Nội dung", null), file);
            assertEquals(0, cloudinary.cleanups);
            for (var synchronization : TransactionSynchronizationManager.getSynchronizations())
                synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            assertEquals(1, cloudinary.cleanups);
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test
    @DisplayName("UTCID22: Update a text-only comment")
    void updateTextOnlyComment() {
        stored = comment("Cũ", null, null);
        Object[] updatedRow = row(5, null, "Mới", null);
        updatedRow[9] = Timestamp.valueOf(LocalDateTime.of(2026, 11, 11, 9, 1));
        rows = List.<Object[]>of(updatedRow);

        var result = service.updateComment(1L, 2L, 5L, new UpdateCommentRequest("  Mới  ", false), null);

        assertEquals("Mới", stored.getContent());
        assertNotNull(stored.getUpdatedAt());
        assertEquals("Mới", result.content());
        assertNotNull(result.updatedAt());
        assertEquals(1, saveCalls);
        assertEquals(0, cloudinary.uploads);
    }

    @Test
    @DisplayName("UTCID23: Update text while keeping the existing attachment")
    void updateTextAndKeepAttachment() {
        String oldUrl = "https://res.cloudinary.com/demo/raw/upload/old.pdf";
        stored = comment("Cũ", oldUrl, "old.pdf");
        rows = List.<Object[]>of(row(5, null, "Mới", oldUrl));

        var result = service.updateComment(1L, 2L, 5L, new UpdateCommentRequest("Mới", false), null);

        assertEquals("Mới", result.content());
        assertEquals(oldUrl, stored.getAudioUrl());
        assertEquals("old.pdf", stored.getAudioPublicId());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, cloudinary.oldCleanups);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID24: Clear text while keeping the existing attachment")
    void updateClearsTextAndKeepsAttachment() {
        String oldUrl = "https://res.cloudinary.com/demo/raw/upload/old.pdf";
        stored = comment("Cũ", oldUrl, "old.pdf");
        rows = List.<Object[]>of(row(5, null, null, oldUrl));

        var result = service.updateComment(1L, 2L, 5L, new UpdateCommentRequest("  ", false), null);

        assertNull(stored.getContent());
        assertEquals(oldUrl, result.attachmentUrl());
        assertFalse(result.deleted());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, cloudinary.oldCleanups);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID25: Replace an attachment and remove the old one only after commit")
    void updateReplacesAttachmentAfterCommit() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        String newUrl = "https://res.cloudinary.com/demo/raw/upload/file.pdf";
        rows = List.<Object[]>of(row(5, null, "Mới", newUrl));
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});
        TransactionSynchronizationManager.initSynchronization();
        try {
            var result = service.updateComment(1L, 2L, 5L, new UpdateCommentRequest("Mới", false), file);
            assertEquals(newUrl, result.attachmentUrl());
            assertEquals(newUrl, stored.getAudioUrl());
            assertEquals("Jtech/Classroom/Comment/file.pdf", stored.getAudioPublicId());
            assertEquals(1, cloudinary.uploads);
            assertEquals(0, cloudinary.oldCleanups);
            for (var synchronization : TransactionSynchronizationManager.getSynchronizations())
                synchronization.afterCommit();
            assertEquals(1, cloudinary.oldCleanups);
            assertEquals(0, cloudinary.cleanups);
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test
    @DisplayName("UTCID26: Remove an attachment while keeping the text")
    void updateRemovesAttachmentAndKeepsText() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        rows = List.<Object[]>of(row(5, null, "Mới", null));

        var result = service.updateComment(1L, 2L, 5L, new UpdateCommentRequest("Mới", true), null);

        assertEquals("Mới", result.content());
        assertNull(result.attachmentUrl());
        assertNull(stored.getAudioUrl());
        assertNull(stored.getAudioPublicId());
        assertEquals(1, cloudinary.oldCleanups);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID27: Reject removing all text and the attachment")
    void updateRejectsEmptyCommentAfterRemovingAttachment() {
        String oldUrl = "https://res.cloudinary.com/demo/raw/upload/old.pdf";
        stored = comment("Cũ", oldUrl, "old.pdf");

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("  ", true), null));

        assertEquals("Nội dung bình luận không được để trống", error.getMessage());
        assertEquals("Cũ", stored.getContent());
        assertEquals(oldUrl, stored.getAudioUrl());
        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.oldCleanups);
    }

    @Test
    @DisplayName("UTCID28: Reject submitting empty text without an attachment")
    void updateRejectsEmptyTextWithoutAttachment() {
        stored = comment("Cũ", null, null);

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("", false), null));

        assertEquals("Nội dung bình luận không được để trống", error.getMessage());
        assertEquals("Cũ", stored.getContent());
        assertNull(stored.getUpdatedAt());
        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.uploads);
    }

    @Test
    @DisplayName("UTCID29: Reject an edited link without HTTP or HTTPS")
    void updateRejectsUnsupportedLinkProtocol() {
        stored = comment("Cũ", null, null);

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("ftp://example.com/file", false), null));

        assertEquals("Liên kết chỉ được dùng HTTP hoặc HTTPS.", error.getMessage());
        assertEquals("Cũ", stored.getContent());
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID30: Accept an edit containing exactly 200 characters")
    void updateAcceptsExactlyTwoHundredCharacters() {
        stored = comment("Cũ", null, null);
        String content = "a".repeat(200);
        rows = List.<Object[]>of(row(5, null, content, null));

        var result = service.updateComment(1L, 2L, 5L, new UpdateCommentRequest(content, false), null);

        assertEquals(content, result.content());
        assertEquals(200, stored.getContent().length());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID31: Reject an edit containing 201 characters")
    void updateRejectsTwoHundredAndOneCharacters() {
        stored = comment("Cũ", null, null);

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("a".repeat(201), false), null));

        assertEquals("Bình luận không được vượt quá 200 ký tự.", error.getMessage());
        assertEquals("Cũ", stored.getContent());
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID32: Reject edits by anyone other than the comment author")
    void updateRejectsOtherAuthorsIncludingModerator() {
        stored = comment("Cũ", null, null);
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});
        actor = user("STUDENT", 20);

        assertThrows(AccessDeniedException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("Mới", false), file));
        actor = user("MODERATOR", 5);
        assertThrows(AccessDeniedException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("Mới", false), file));

        assertEquals("Cũ", stored.getContent());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID33: Reject removing and replacing an attachment together")
    void updateRejectsConflictingAttachmentChanges() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("Mới", true), file));

        assertEquals("Không thể vừa gỡ vừa thay tệp đính kèm.", error.getMessage());
        assertEquals("Cũ", stored.getContent());
        assertEquals(0, cloudinary.uploads);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID34: Keep the comment when the attachment service rejects a file")
    void updateRejectsInvalidAttachment() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        var file = new MockMultipartFile("attachment", "invalid.exe", "application/octet-stream", new byte[]{1});
        cloudinary.uploadFailure = new IllegalArgumentException("Tệp không hợp lệ.");

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("Mới", false), file));

        assertSame(cloudinary.uploadFailure, error);
        assertEquals("Cũ", stored.getContent());
        assertEquals("old.pdf", stored.getAudioPublicId());
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID35: Keep the comment when attachment upload fails")
    void updateStopsWhenAttachmentUploadFails() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});
        cloudinary.uploadFailure = new IllegalStateException("Cloudinary failed");

        var error = assertThrows(ResponseStatusException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("Mới", false), file));

        assertEquals(500, error.getStatusCode().value());
        assertSame(cloudinary.uploadFailure, error.getCause());
        assertEquals("Cũ", stored.getContent());
        assertEquals("old.pdf", stored.getAudioPublicId());
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID36: Delete a new upload when saving the edit fails")
    void updateCleansNewUploadWhenSaveFails() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        saveFailure = new IllegalStateException("database failed");
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});

        var error = assertThrows(IllegalStateException.class, () -> service.updateComment(1L, 2L, 5L,
                new UpdateCommentRequest("Mới", false), file));

        assertSame(saveFailure, error);
        assertEquals(1, cloudinary.uploads);
        assertEquals(1, cloudinary.cleanups);
        assertEquals(0, cloudinary.oldCleanups);
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID37: Delete a new upload and retain the old one after rollback")
    void updateCleansNewUploadAfterRollback() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        rows = List.<Object[]>of(row(5, null, "Mới",
                "https://res.cloudinary.com/demo/raw/upload/file.pdf"));
        var file = new MockMultipartFile("attachment", "file.pdf", "application/pdf", new byte[]{1});
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.updateComment(1L, 2L, 5L, new UpdateCommentRequest("Mới", false), file);
            assertEquals(0, cloudinary.cleanups);
            assertEquals(0, cloudinary.oldCleanups);
            for (var synchronization : TransactionSynchronizationManager.getSynchronizations())
                synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            assertEquals(1, cloudinary.cleanups);
            assertEquals(0, cloudinary.oldCleanups);
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test
    @DisplayName("UTCID38: Student soft-deletes their text-only comment")
    void deleteOwnTextOnlyComment() {
        stored = comment("Cũ", null, null);

        service.deleteComment(1L, 2L, 5L);

        assertEquals(5L, stored.getId());
        assertNull(stored.getContent());
        assertNull(stored.getAudioUrl());
        assertNull(stored.getAudioPublicId());
        assertNotNull(stored.getUpdatedAt());
        assertEquals(1, saveCalls);
        assertEquals(0, cloudinary.oldCleanups);
    }

    @Test
    @DisplayName("UTCID39: Student deletes their attachment-only comment")
    void deleteOwnAttachmentOnlyComment() {
        stored = comment(null, "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");

        service.deleteComment(1L, 2L, 5L);

        assertNull(stored.getContent());
        assertNull(stored.getAudioUrl());
        assertNull(stored.getAudioPublicId());
        assertNotNull(stored.getUpdatedAt());
        assertEquals(1, saveCalls);
        assertEquals(1, cloudinary.oldCleanups);
    }

    @Test
    @DisplayName("UTCID40: Moderator deletes a student's comment")
    void moderatorDeletesStudentComment() {
        actor = user("MODERATOR", 5);
        stored = comment("Cũ", null, null);
        stored.setUserId(10L);

        service.deleteComment(1L, 2L, 5L);

        assertEquals(10L, stored.getUserId());
        assertNull(stored.getContent());
        assertNotNull(stored.getUpdatedAt());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID41: Student cannot delete another student's comment")
    void studentCannotDeleteAnotherStudentComment() {
        String oldUrl = "https://res.cloudinary.com/demo/raw/upload/old.pdf";
        stored = comment("Cũ", oldUrl, "old.pdf");
        stored.setUserId(20L);

        var error = assertThrows(AccessDeniedException.class, () -> service.deleteComment(1L, 2L, 5L));

        assertEquals("Bạn chỉ được xóa bình luận của mình.", error.getMessage());
        assertEquals("Cũ", stored.getContent());
        assertEquals(oldUrl, stored.getAudioUrl());
        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.oldCleanups);
    }

    @Test
    @DisplayName("UTCID42: Reject deleting an already deleted comment")
    void deleteRejectsAlreadyDeletedComment() {
        stored = comment(null, null, null);

        var error = assertThrows(EntityNotFoundException.class, () -> service.deleteComment(1L, 2L, 5L));

        assertEquals("Bình luận đã xóa.", error.getMessage());
        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.oldCleanups);
    }

    @Test
    @DisplayName("UTCID43: Delete the attachment only after the transaction commits")
    void deleteAttachmentCleanupRunsAfterCommit() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.deleteComment(1L, 2L, 5L);
            assertEquals(1, saveCalls);
            assertEquals(0, cloudinary.oldCleanups);
            for (var synchronization : TransactionSynchronizationManager.getSynchronizations())
                synchronization.afterCommit();
            assertEquals(1, cloudinary.oldCleanups);
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test
    @DisplayName("UTCID44: Keep the attachment when the delete transaction rolls back")
    void deleteKeepsAttachmentAfterRollback() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.deleteComment(1L, 2L, 5L);
            for (var synchronization : TransactionSynchronizationManager.getSynchronizations())
                synchronization.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            assertEquals(1, saveCalls);
            assertEquals(0, cloudinary.oldCleanups);
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }

    @Test
    @DisplayName("UTCID45: Keep deletion successful when Cloudinary cleanup fails")
    void deleteKeepsSuccessIfCloudinaryCleanupFails() {
        stored = comment("Cũ", "https://res.cloudinary.com/demo/raw/upload/old.pdf", "old.pdf");
        cloudinary.failOldCleanup = true;

        assertDoesNotThrow(() -> service.deleteComment(1L, 2L, 5L));

        assertNull(stored.getContent());
        assertNull(stored.getAudioUrl());
        assertNotNull(stored.getUpdatedAt());
        assertEquals(1, saveCalls);
        assertEquals(1, cloudinary.oldCleanups);
    }

    private static ClassPostComment comment(String content, String url, String publicId) {
        var comment = new ClassPostComment();
        comment.setId(5L); comment.setPostId(2L); comment.setUserId(10L);
        comment.setContent(content); comment.setAudioUrl(url); comment.setAudioPublicId(publicId);
        return comment;
    }
}
