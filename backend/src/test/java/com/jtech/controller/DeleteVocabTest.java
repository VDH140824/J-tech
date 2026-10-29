package com.jtech.controller;

import com.jtech.entity.Course;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DeleteVocabTest {

    private final VocabularyRepository vocabulary = mock(VocabularyRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyService service = new VocabularyService(lessons);
    private final VocabularyController controller = new VocabularyController(vocabulary, service);

    private Vocabulary existing(Course.Status status) {
        var word = new Vocabulary();
        word.setId(10L);
        word.setLessonId(3L);
        word.setWord("日本語");
        word.setReading("にほんご");
        word.setMeaningVi("Tiếng Nhật");
        word.setDisplayOrder(0);
        word.setStatus(status);
        return word;
    }

    @Test
    @DisplayName("Archive retains the row and its content")
    void archiveUsesSaveAndNeverHardDeletes() {
        // Archiving retains the record.
        // Verifies the non-destructive repository operation, not real DB history retention.
        var word = existing(Course.Status.PUBLISHED);
        when(vocabulary.findById(10L)).thenReturn(Optional.of(word));
        controller.archive(10L);
        assertAll(() -> assertEquals(Course.Status.ARCHIVED, word.getStatus()),
                () -> assertEquals(10L, word.getId()),
                () -> assertEquals(3L, word.getLessonId()),
                () -> assertEquals("日本語", word.getWord()),
                () -> assertEquals("にほんご", word.getReading()),
                () -> assertEquals("Tiếng Nhật", word.getMeaningVi()));
        verify(vocabulary).findById(10L);
        verify(vocabulary).save(word);
        verifyNoMoreInteractions(vocabulary); // Also rules out all physical-delete methods.
    }

    @Test
    @DisplayName("Archived vocabulary is hidden from students")
    void archivedWordIsHiddenFromStudents() {
        var student = new UsernamePasswordAuthenticationToken("student", "",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        var archived = existing(Course.Status.ARCHIVED);
        assertTrue(service.visible(List.of(archived), null, student).isEmpty());
        verifyNoInteractions(vocabulary, lessons);
    }

    @Test
    @DisplayName("Archive rejects a missing vocabulary item")
    void archiveRejectsMissingVocabulary() {
        assertThrows(RuntimeException.class, () -> controller.archive(999L));
        verify(vocabulary).findById(999L);
        verifyNoMoreInteractions(vocabulary);
    }

}
