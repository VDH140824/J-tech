package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackResolutionRequest;
import com.jtech.entity.User;
import com.jtech.repository.UserRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/** CD-17: SRS UC-48, UC-50, UC-63, UC-64 and BR59. */
@Tag("unit-test-report")
class FeedbackHandlingSrsUnitTest {

    private record Fixture(JdbcTemplate db, ApplicationEventPublisher events, FeedbackService service, User handler) {}

    private Fixture fixture() {
        var db = mock(JdbcTemplate.class);
        var events = mock(ApplicationEventPublisher.class);
        var service = new FeedbackService(db, mock(UserRepository.class), mock(Cloudinary.class), events);
        return new Fixture(db, events, service, User.builder().userId(20L).build());
    }

    @Test
    void resolve() {
        for (var type : List.of("CONTENT", "TECHNICAL")) {
            for (var status : List.of(FeedbackResolutionRequest.Status.RESOLVED, FeedbackResolutionRequest.Status.REJECTED)) {
                var missingNote = fixture();
                when(missingNote.db().queryForList(anyString(), eq(8L), eq(type))).thenReturn(List.of(Map.of("id", 8L)));
                assertThrows(IllegalArgumentException.class, () -> missingNote.service().resolve(
                    8L, type, missingNote.handler(), new FeedbackResolutionRequest(status, "   ", 0L)
                ));
                verify(missingNote.db(), never()).update(anyString(), any(Object[].class));
                verifyNoInteractions(missingNote.events());
            }
        }

        var stale = fixture();
        when(stale.db().queryForList(anyString(), eq(8L), eq("CONTENT"))).thenReturn(List.of(Map.of("id", 8L)));
        when(stale.db().update(anyString(), eq("RESOLVED"), eq("Đã sửa học liệu"), eq(20L), eq(true), eq(8L), eq(0L))).thenReturn(0);

        var failure = assertThrows(ResponseStatusException.class, () -> stale.service().resolve(
            8L, "CONTENT", stale.handler(),
            new FeedbackResolutionRequest(FeedbackResolutionRequest.Status.RESOLVED, "Đã sửa học liệu", 0L)
        ));
        assertEquals(HttpStatus.CONFLICT, failure.getStatusCode());
        verifyNoInteractions(stale.events());
    }
}
