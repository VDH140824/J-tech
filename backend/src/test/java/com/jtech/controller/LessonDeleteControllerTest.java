package com.jtech.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import com.jtech.service.CloudinaryService;
import com.jtech.service.LessonService;
import jakarta.validation.Validator;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;

class LessonDeleteControllerTest {

    private final LessonRepository lessons = mock(LessonRepository.class);
    private final LessonService service = new LessonService(
        lessons,
        mock(ChapterRepository.class),
        mock(Validator.class),
        mock(CloudinaryService.class)
    );
    private final LessonController controller = new LessonController(service);

    @Test
    void reportsConflictWhenRelatedDataPreventsDeletion() {
        when(lessons.existsById(1L)).thenReturn(true);
        doThrow(new DataIntegrityViolationException("foreign key constraint"))
            .when(lessons)
            .deleteById(1L);
        var exception = assertThrows(ResponseStatusException.class, () ->
            controller.deleteLesson(1L)
        );
        var response = new GlobalExceptionHandler().handleResponseStatusException(exception);
        assertEquals(409, response.getStatusCode().value());
        assertTrue(
            ((Map<?, ?>) response.getBody()).get("message").toString().contains("dữ liệu liên kết")
        );
        verify(lessons, never()).save(any());
    }

    @Test
    void deletesUnreferencedLesson() {
        when(lessons.existsById(2L)).thenReturn(true);
        assertEquals(204, controller.deleteLesson(2L).getStatusCode().value());
        verify(lessons).deleteById(2L);
    }

    @Test
    void doesNotDeleteMissingLesson() {
        assertEquals(
            404,
            assertThrows(ResponseStatusException.class, () -> controller.deleteLesson(3L))
                .getStatusCode()
                .value()
        );
        verify(lessons, never()).deleteById(anyLong());
    }
}
