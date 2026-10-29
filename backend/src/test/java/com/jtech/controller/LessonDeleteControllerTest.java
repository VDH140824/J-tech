package com.jtech.controller;

import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LessonDeleteControllerTest {
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final LessonController controller = new LessonController(lessons, mock(ChapterRepository.class));

    @Test void reportsConflictWhenRelatedDataPreventsDeletion() {
        when(lessons.existsById(1L)).thenReturn(true);
        doThrow(new DataIntegrityViolationException("foreign key constraint")).when(lessons).deleteById(1L);
        var response = controller.deleteLesson(1L);
        assertEquals(409, response.getStatusCode().value());
        assertTrue(((Map<?, ?>) response.getBody()).get("message").toString().contains("dữ liệu liên kết"));
        verify(lessons, never()).save(any());
    }

    @Test void deletesUnreferencedLesson() {
        when(lessons.existsById(2L)).thenReturn(true);
        assertEquals(204, controller.deleteLesson(2L).getStatusCode().value());
        verify(lessons).deleteById(2L);
    }

    @Test void doesNotDeleteMissingLesson() {
        assertEquals(404, controller.deleteLesson(3L).getStatusCode().value());
        verify(lessons, never()).deleteById(anyLong());
    }
}
