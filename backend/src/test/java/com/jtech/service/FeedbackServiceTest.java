package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackRequest;
import com.jtech.dto.request.FeedbackResolutionRequest;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.UserRepository;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

class FeedbackServiceTest {

    private record Fixture(
        JdbcTemplate db,
        Cloudinary cloudinary,
        ApplicationEventPublisher events,
        FeedbackService service,
        Principal principal,
        User student
    ) {}

    private Fixture fixture() {
        var db = mock(JdbcTemplate.class);
        var users = mock(UserRepository.class);
        var cloudinary = mock(Cloudinary.class);
        var events = mock(ApplicationEventPublisher.class);
        Principal principal = () -> "student@example.com";
        var student = User.builder()
            .userId(4L)
            .email(principal.getName())
            .status(UserStatus.ACTIVE)
            .role(Role.builder().roleName("STUDENT").build())
            .build();
        when(users.findByEmail(principal.getName())).thenReturn(Optional.of(student));
        return new Fixture(db, cloudinary, events, new FeedbackService(db, users, cloudinary, events), principal, student);
    }

    @Test
    void actor() {
        var f = fixture();

        assertSame(f.student(), f.service().actor(f.principal(), "STUDENT"));
        assertThrows(AccessDeniedException.class, () -> f.service().actor(f.principal(), "MODERATOR"));
        f.student().setStatus(UserStatus.LOCKED);
        assertThrows(AccessDeniedException.class, () -> f.service().actor(f.principal(), "STUDENT"));
        assertThrows(AccessDeniedException.class, () -> f.service().actor(null, "STUDENT"));
    }

    @Test
    @Tag("unit-test-report")
    void submit() {
        var invalidCategory = fixture();
        var categoryRequest = new FeedbackRequest(
            FeedbackRequest.Type.CONTENT, "SYSTEM", "Title", "Body", 1L, null
        );
        assertThrows(IllegalArgumentException.class, () ->
            invalidCategory.service().submit(invalidCategory.principal(), categoryRequest, null)
        );
        verifyNoInteractions(invalidCategory.db(), invalidCategory.cloudinary());

        var technicalReference = fixture();
        var technicalRequest = new FeedbackRequest(
            FeedbackRequest.Type.TECHNICAL, "SYSTEM", "Title", "Body", 1L, null
        );
        assertThrows(IllegalArgumentException.class, () ->
            technicalReference.service().submit(technicalReference.principal(), technicalRequest, null)
        );
        verifyNoInteractions(technicalReference.db(), technicalReference.cloudinary());

        var missingLesson = fixture();
        when(missingLesson.db().queryForObject(anyString(), eq(Integer.class), eq(1L))).thenReturn(0);
        var lessonRequest = new FeedbackRequest(
            FeedbackRequest.Type.CONTENT, "LECTURE", "Title", "Body", 1L, null
        );
        assertThrows(IllegalArgumentException.class, () ->
            missingLesson.service().submit(missingLesson.principal(), lessonRequest, null)
        );
        verifyNoInteractions(missingLesson.cloudinary());

        var foreignQuestion = fixture();
        when(foreignQuestion.db().queryForList(anyString(), eq(7L))).thenReturn(List.of(Map.of("lesson_id", 2L)));
        var questionRequest = new FeedbackRequest(
            FeedbackRequest.Type.CONTENT, "QUESTION", "Title", "Body", 1L, 7L
        );
        assertThrows(IllegalArgumentException.class, () ->
            foreignQuestion.service().submit(foreignQuestion.principal(), questionRequest, null)
        );
        verifyNoInteractions(foreignQuestion.cloudinary());
    }

    @Test
    void validateImage() {
        var service = fixture().service();
        assertDoesNotThrow(() -> service.validateImage(null));
        assertThrows(IllegalArgumentException.class, () ->
            service.validateImage(new MockMultipartFile("image", "fake.png", "image/png", "not an image".getBytes()))
        );
        assertThrows(IllegalArgumentException.class, () ->
            service.validateImage(new MockMultipartFile("image", "large.png", "image/png", new byte[3 * 1024 * 1024 + 1]))
        );
        assertThrows(IllegalArgumentException.class, () ->
            service.validateImage(new MockMultipartFile("image", "file.svg", "image/svg+xml", "<svg/>".getBytes()))
        );
        assertDoesNotThrow(() -> service.validateImage(new MockMultipartFile(
            "image", "image.png", "image/png", new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10}
        )));
    }

    @Test
    void detail() {
        var f = fixture();
        when(f.db().queryForList(anyString(), eq(8L), eq(4L))).thenReturn(List.of());

        assertThrows(ResponseStatusException.class, () -> f.service().detail(8L, 4L, null));
        verify(f.db()).queryForList(contains("AND f.user_id=?"), eq(8L), eq(4L));
    }

    @Test
    @Tag("unit-test-report")
    void resolve() {
        var wrongQueue = fixture();
        when(wrongQueue.db().queryForList(anyString(), eq(8L), eq("TECHNICAL"))).thenReturn(List.of());
        assertThrows(ResponseStatusException.class, () -> wrongQueue.service().resolve(
            8L, "TECHNICAL", wrongQueue.student(),
            new FeedbackResolutionRequest(FeedbackResolutionRequest.Status.RESOLVED, "Done")
        ));
        verifyNoInteractions(wrongQueue.events());

        var missingNote = fixture();
        when(missingNote.db().queryForList(anyString(), eq(8L), eq("CONTENT"))).thenReturn(List.of(Map.of("id", 8L)));
        for (var status : List.of(FeedbackResolutionRequest.Status.RESOLVED, FeedbackResolutionRequest.Status.REJECTED)) {
            assertThrows(IllegalArgumentException.class, () -> missingNote.service().resolve(
                8L, "CONTENT", missingNote.student(), new FeedbackResolutionRequest(status, "  \n ")
            ));
        }
        verifyNoInteractions(missingNote.events());

        var success = fixture();
        when(success.db().queryForList(startsWith("SELECT id FROM feedback"), eq(8L), eq("CONTENT")))
            .thenReturn(List.of(Map.of("id", 8L)));
        when(success.db().queryForList(contains("LEFT JOIN lesson"), any(Object[].class)))
            .thenReturn(List.of(Map.of("submitterEmail", "student@example.com", "title", "Lỗi bài học")));
        when(success.db().update(contains("UPDATE feedback SET"), any(Object[].class))).thenReturn(1);

        success.service().resolve(
            8L, "CONTENT", success.student(),
            new FeedbackResolutionRequest(FeedbackResolutionRequest.Status.RESOLVED, "Đã sửa", 0L)
        );

        verify(success.db()).update(contains("UPDATE feedback"), eq("RESOLVED"), eq("Đã sửa"), eq(4L), eq(true), eq(8L), eq(0L));
        verify(success.db()).update(contains("INSERT INTO notification"), any(), any(), eq("/feedback?id=8"), eq(8L));
        verify(success.events()).publishEvent(any(FeedbackMailService.ResolutionMail.class));
    }

    @Test
    void list() {
        var f = fixture();
        assertThrows(IllegalArgumentException.class, () -> f.service().list(4L, null, null, null, null, null, -1, 10));
        assertThrows(IllegalArgumentException.class, () -> f.service().list(4L, null, null, null, null, null, 0, 101));
        assertThrows(IllegalArgumentException.class, () -> f.service().list(4L, null, "UNKNOWN", null, null, null, 0, 10));
        verifyNoInteractions(f.db());
    }
}
