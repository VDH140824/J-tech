package com.jtech.service;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackRequest;
import com.jtech.dto.request.FeedbackResolutionRequest;
import com.jtech.entity.*;
import com.jtech.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class FeedbackServiceTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FeedbackService service = new FeedbackService(db, users, cloudinary, events);
    private final Principal principal = () -> "student@example.com";
    private User student;

    @BeforeEach void setup() {
        student = User.builder().userId(4L).email(principal.getName()).status(UserStatus.ACTIVE)
            .role(Role.builder().roleName("STUDENT").build()).build();
        when(users.findByEmail(principal.getName())).thenReturn(Optional.of(student));
    }
    @Test void rejectsWrongRoleAndInactiveUsers() {
        assertSame(student, service.actor(principal, "STUDENT"));
        assertThrows(AccessDeniedException.class, () -> service.actor(principal, "MODERATOR"));
        student.setStatus(UserStatus.LOCKED);
        assertThrows(AccessDeniedException.class, () -> service.actor(principal, "STUDENT"));
        assertThrows(AccessDeniedException.class, () -> service.actor(null, "STUDENT"));
    }
    @Test void rejectsMismatchedCategoryBeforePersistenceOrUpload() {
        var input = new FeedbackRequest(FeedbackRequest.Type.CONTENT, "SYSTEM", "Title", "Body", 1L, null);
        assertThrows(IllegalArgumentException.class, () -> service.submit(principal, input, null));
        verifyNoInteractions(db, cloudinary);
    }
    @Test void rejectsTechnicalFeedbackWithContentReference() {
        var input = new FeedbackRequest(FeedbackRequest.Type.TECHNICAL, "SYSTEM", "Title", "Body", 1L, null);
        assertThrows(IllegalArgumentException.class, () -> service.submit(principal, input, null));
        verifyNoInteractions(db, cloudinary);
    }
    @Test void rejectsUnpublishedOrMissingLesson() {
        when(db.queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(0);
        var input = new FeedbackRequest(FeedbackRequest.Type.CONTENT, "LECTURE", "Title", "Body", 1L, null);
        assertThrows(IllegalArgumentException.class, () -> service.submit(principal, input, null));
        verifyNoInteractions(cloudinary);
    }
    @Test void rejectsQuestionFromAnotherLesson() {
        when(db.queryForList(anyString(), eq(7L))).thenReturn(List.of(Map.of("lesson_id", 2L)));
        var input = new FeedbackRequest(FeedbackRequest.Type.CONTENT, "QUESTION", "Title", "Body", 1L, 7L);
        assertThrows(IllegalArgumentException.class, () -> service.submit(principal, input, null));
        verifyNoInteractions(cloudinary);
    }
    @Test void validatesImageBytesTypeAndSize() {
        assertDoesNotThrow(() -> service.validateImage(null));
        assertThrows(IllegalArgumentException.class, () -> service.validateImage(new MockMultipartFile("image", "fake.png", "image/png", "not an image".getBytes())));
        assertThrows(IllegalArgumentException.class, () -> service.validateImage(new MockMultipartFile("image", "large.png", "image/png", new byte[3 * 1024 * 1024 + 1])));
        assertThrows(IllegalArgumentException.class, () -> service.validateImage(new MockMultipartFile("image", "file.svg", "image/svg+xml", "<svg/>".getBytes())));
        assertDoesNotThrow(() -> service.validateImage(new MockMultipartFile("image", "image.png", "image/png", new byte[]{(byte)137,80,78,71,13,10,26,10})));
    }
    @Test void detailIsScopedToOwner() {
        when(db.queryForList(anyString(), eq(8L), eq(4L))).thenReturn(List.of());
        assertThrows(ResponseStatusException.class, () -> service.detail(8L, 4L, null));
        verify(db).queryForList(contains("AND f.user_id=?"), eq(8L), eq(4L));
    }
    @Test void resolutionCannotCrossQueues() {
        when(db.queryForList(anyString(), eq(8L), eq("TECHNICAL"))).thenReturn(List.of());
        assertThrows(ResponseStatusException.class, () -> service.resolve(8L, "TECHNICAL", student,
            new FeedbackResolutionRequest(FeedbackResolutionRequest.Status.RESOLVED, "Done")));
        verifyNoInteractions(events);
    }
    @Test void finalStatusesRequireNonWhitespaceNote() {
        when(db.queryForList(anyString(), eq(8L), eq("CONTENT"))).thenReturn(List.of(Map.of("id", 8L)));
        for (var status : List.of(FeedbackResolutionRequest.Status.RESOLVED, FeedbackResolutionRequest.Status.REJECTED)) {
            assertThrows(IllegalArgumentException.class, () -> service.resolve(8L, "CONTENT", student, new FeedbackResolutionRequest(status, "  \n ")));
        }
        verifyNoInteractions(events);
    }
    @Test void validResolutionWritesNotificationAndPublishesEmail() {
        when(db.queryForList(startsWith("SELECT id FROM feedback"), eq(8L), eq("CONTENT"))).thenReturn(List.of(Map.of("id", 8L)));
        when(db.queryForList(contains("LEFT JOIN lesson"), any(Object[].class))).thenReturn(List.of(Map.of("submitterEmail", "student@example.com", "title", "Lỗi bài học")));
        service.resolve(8L, "CONTENT", student, new FeedbackResolutionRequest(FeedbackResolutionRequest.Status.RESOLVED, "Đã sửa"));
        verify(db).update(contains("UPDATE feedback"), eq("RESOLVED"), eq("Đã sửa"), eq(4L), eq(true), eq(8L));
        verify(db).update(contains("INSERT INTO notification"), any(), any(), eq("/feedback?id=8"), eq(8L));
        verify(events).publishEvent(any(FeedbackMailService.ResolutionMail.class));
    }
    @Test void rejectsUnboundedPaginationAndInvalidStatuses() {
        assertThrows(IllegalArgumentException.class, () -> service.list(4L, null, null, null, null, null, -1, 10));
        assertThrows(IllegalArgumentException.class, () -> service.list(4L, null, null, null, null, null, 0, 101));
        assertThrows(IllegalArgumentException.class, () -> service.list(4L, null, "UNKNOWN", null, null, null, 0, 10));
        verifyNoInteractions(db);
    }
}
