package com.jtech.controller;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.Course;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UpdateVocabTest {

    private final VocabularyRepository vocabulary = mock(VocabularyRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyService service = new VocabularyService(lessons);
    private final VocabularyController controller = new VocabularyController(vocabulary, service);

    private VocabularyRequest input(String word, String reading, String meaning, Integer order) {
        // Null legacy audio fields deliberately model the confirmed synthesis workflow.
        return new VocabularyRequest(word, reading, meaning, null, null, null,
                null, null, order, Course.Status.DRAFT);
    }

    private VocabularyRequest validInput() {
        return input("日本語", "にほんご", "Tiếng Nhật", 0);
    }

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
    @DisplayName("Duplicate update excludes the current vocabulary ID")
    void duplicateUpdateDoesNotAlterExistingWord() {
        var word = existing(Course.Status.DRAFT);
        when(vocabulary.findById(10L)).thenReturn(Optional.of(word));
        when(vocabulary.existsByLessonIdAndWordIgnoreCaseAndIdNot(3L, "別", 10L)).thenReturn(true);
        assertThrows(IllegalStateException.class,
                () -> controller.update(10L, input("別", "べつ", "Khác", 1)));
        assertEquals("日本語", word.getWord());
        verify(vocabulary).findById(10L);
        verify(vocabulary).existsByLessonIdAndWordIgnoreCaseAndIdNot(3L, "別", 10L);
        verifyNoMoreInteractions(vocabulary);
    }

    @Test
    @DisplayName("Update saves information, order and status")
    void updateSavesVocabularyChanges() {
        var word = existing(Course.Status.DRAFT);
        when(vocabulary.findById(10L)).thenReturn(Optional.of(word));
        when(vocabulary.save(word)).thenReturn(word);
        var request = new VocabularyRequest("別", "べつ", "Khác", "Noun", "例", "Ví dụ",
                null, null, 2, Course.Status.PUBLISHED);
        var updated = controller.update(10L, request);
        assertAll(() -> assertEquals("別", updated.getWord()),
                () -> assertEquals("べつ", updated.getReading()),
                () -> assertEquals("Khác", updated.getMeaningVi()),
                () -> assertEquals(2, updated.getDisplayOrder()),
                () -> assertEquals(Course.Status.PUBLISHED, updated.getStatus()),
                () -> assertEquals(3L, updated.getLessonId()));
        verify(vocabulary).save(word);
    }

    @Test
    @DisplayName("Edit archived vocabulary")
    void archivedWordCanBeEdited() {
        var word = existing(Course.Status.ARCHIVED);
        when(vocabulary.findById(10L)).thenReturn(Optional.of(word));
        when(vocabulary.save(word)).thenReturn(word);
        var updated = controller.update(10L, validInput());
        assertEquals(Course.Status.DRAFT, updated.getStatus());
        assertEquals(10L, updated.getId());
        verify(vocabulary).save(word);
    }

    @Test
    @DisplayName("Update rejects a missing vocabulary item")
    void updateRejectsMissingVocabulary() {
        assertThrows(RuntimeException.class, () -> controller.update(999L, validInput()));
        verify(vocabulary).findById(999L);
        verifyNoMoreInteractions(vocabulary);
    }

}
