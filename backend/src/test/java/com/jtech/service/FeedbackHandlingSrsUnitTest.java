package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackResolutionRequest;
import com.jtech.entity.User;
import com.jtech.repository.UserRepository;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** CD-17: SRS UC-48/49/50/63/64; BR59/113/115. Resolution note validation. */
@Tag("unit-test-report")
@DisplayName("CD-17 Feedback Handling — SRS UC-48 / 49 / 50 / 63 / 64")
class FeedbackHandlingSrsUnitTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FeedbackService service = new FeedbackService(db, mock(UserRepository.class), mock(Cloudinary.class), events);
    private final User handler = User.builder().userId(20L).build();

    @ParameterizedTest(name = "UT17-14/15/24/25 {0} {1} requires a non-blank note")
    @CsvSource({"CONTENT,RESOLVED", "CONTENT,REJECTED", "TECHNICAL,RESOLVED", "TECHNICAL,REJECTED"})
    void rejectsTerminalStatusWithoutNote(String type, FeedbackResolutionRequest.Status status) {
        when(db.queryForList(anyString(), eq(8L), eq(type)))
            .thenReturn(List.of(Map.of("id", 8L)));
        assertThrows(IllegalArgumentException.class, () -> service.resolve(8L, type, handler,
            new FeedbackResolutionRequest(status, "   ", 0L)));
        verify(db, never()).update(anyString(), any(Object[].class));
        verifyNoInteractions(events);
    }

    // UC-50 alternative flow 4a: do not overwrite a concurrent update.
    @Test
    void rejectsStaleResolutionWithoutSendingNotification() {
        when(db.queryForList(anyString(), eq(8L), eq("CONTENT")))
            .thenReturn(List.of(Map.of("id", 8L)));
        when(db.update(anyString(), eq("RESOLVED"), eq("Đã sửa học liệu"),
            eq(20L), eq(true), eq(8L), eq(0L))).thenReturn(0);
        var request = new FeedbackResolutionRequest(
            FeedbackResolutionRequest.Status.RESOLVED, "Đã sửa học liệu", 0L);

        var failure = assertThrows(ResponseStatusException.class,
            () -> service.resolve(8L, "CONTENT", handler, request));

        assertEquals(HttpStatus.CONFLICT, failure.getStatusCode());
        verifyNoInteractions(events);
    }

}
