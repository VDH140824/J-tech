package com.jtech.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.Course;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.exception.GlobalExceptionHandler;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Tag("unit-test-report")
class UpdateVocabTest {

    // Example inputs for execution; expected behavior comes from UC-42.

    private final VocabularyRepository vocabulary = mock(VocabularyRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyService service = new VocabularyService(lessons);
    private final VocabularyController controller = new VocabularyController(vocabulary, service);
    private final UsernamePasswordAuthenticationToken moderator = new UsernamePasswordAuthenticationToken(
        "moderator",
        "",
        java.util.List.of(new SimpleGrantedAuthority("MODERATOR"))
    );

    @BeforeEach
    void stubVocabularyLesson() {
        var lesson = new com.jtech.entity.Lesson();
        lesson.setSkillType(com.jtech.entity.Lesson.SkillType.VOCABULARY);
        when(lessons.findById(3L)).thenReturn(Optional.of(lesson));
    }

    private VocabularyRequest input(String word, String reading, String meaning, Integer order) {
        return new VocabularyRequest(
            word,
            reading,
            meaning,
            null,
            null,
            null,
            order,
            Course.Status.DRAFT
        );
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
        assertThrows(IllegalStateException.class, () ->
            controller.update(3L, 10L, input("別", "べつ", "Khác", 1), moderator)
        );
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
        var request = new VocabularyRequest(
            "別",
            "べつ",
            "Khác",
            "Noun",
            "例",
            "Ví dụ",
            2,
            Course.Status.PUBLISHED
        );
        var updated = controller.update(3L, 10L, request, moderator);
        assertAll(
            () -> assertEquals("別", updated.getWord()),
            () -> assertEquals("べつ", updated.getReading()),
            () -> assertEquals("Khác", updated.getMeaningVi()),
            () -> assertEquals(2, updated.getDisplayOrder()),
            () -> assertEquals(Course.Status.PUBLISHED, updated.getStatus()),
            () -> assertEquals(3L, updated.getLessonId())
        );
        assertEquals(request.wordType(), updated.getWordType());
        assertEquals(request.exampleJp(), updated.getExampleJp());
        assertEquals(request.exampleVi(), updated.getExampleVi());
        verify(vocabulary).save(word);
    }

    @Test
    @DisplayName("Edit archived vocabulary")
    void archivedWordCanBeEdited() {
        var word = existing(Course.Status.ARCHIVED);
        when(vocabulary.findById(10L)).thenReturn(Optional.of(word));
        when(vocabulary.save(word)).thenReturn(word);
        var updated = controller.update(3L, 10L, validInput(), moderator);
        assertEquals(Course.Status.DRAFT, updated.getStatus());
        assertEquals(10L, updated.getId());
        verify(vocabulary).save(word);
    }

    @Test
    @DisplayName("Update rejects a missing vocabulary item")
    void updateRejectsMissingVocabulary() {
        assertThrows(ResponseStatusException.class, () -> controller.update(3L, 999L, validInput(), moderator));
        verify(vocabulary).findById(999L);
        verifyNoMoreInteractions(vocabulary);
    }

    @Test
    @DisplayName("Keep the current word without a duplicate error")
    void updateWithoutChangingWord() {
        var word = existing(Course.Status.DRAFT);
        when(vocabulary.findById(10L)).thenReturn(Optional.of(word));
        when(vocabulary.save(word)).thenReturn(word);
        assertSame(word, controller.update(3L, 10L, validInput(), moderator));
        verify(vocabulary).existsByLessonIdAndWordIgnoreCaseAndIdNot(3L, "日本語", 10L);
        verify(vocabulary).save(word);
    }

    @ParameterizedTest(name = "Reject invalid {0}")
    @ValueSource(strings = {"word", "reading", "meaningVi", "displayOrder"})
    @DisplayName("Reject missing required fields before updating")
    void rejectMissingRequiredField(String field) throws Exception {
        var json = new ObjectMapper();
        var body = json.valueToTree(validInput());
        ((com.fasterxml.jackson.databind.node.ObjectNode) body).putNull(field);
        var mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(put("/lessons/3/vocabularies/10").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(body)))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(vocabulary, lessons);
    }

    @Test
    @DisplayName("Reject negative display order before updating")
    void rejectNegativeDisplayOrder() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(put("/lessons/3/vocabularies/10").contentType(MediaType.APPLICATION_JSON)
                .content(new ObjectMapper().writeValueAsString(input("日本語", "にほんご", "Tiếng Nhật", -1))))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(vocabulary, lessons);
    }
}
