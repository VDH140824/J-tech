package com.jtech.service;

import com.jtech.controller.VocabularyController;
import com.jtech.dto.request.*;
import com.jtech.entity.*;
import com.jtech.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** One method per column in the CRUD Vocab report sheet. */
class VocabularyCrudUnitTest {

    private final VocabularyRepository repository = mock(VocabularyRepository.class);
    private final VocabularyService service = new VocabularyService(mock(LessonRepository.class));
    private final VocabularyService access = mock(VocabularyService.class);
    private final VocabularyController controller = new VocabularyController(repository, access);
    private VocabularyRequest request(String word, String audio, Integer order) {
        return new VocabularyRequest(word, "reading", "meaning", "noun", "", "", audio, "", order, Course.Status.DRAFT);
    }
    private void validation(VocabularyRequest input, String field, boolean valid) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violations = factory.getValidator().validate(input);
            if (valid) assertTrue(violations.isEmpty(), violations.toString());
            else { assertFalse(violations.isEmpty()); assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals(field))); }
        }
    }

    @Test
    @DisplayName("CRUD Vocab/UTC001: Create a valid vocabulary entry")
    void utc001() throws Exception {
        when(repository.save(any())).thenAnswer(c -> c.getArgument(0));
        var response = controller.create(12L, request("  Japanese  ", "https://example.com/a.mp3", 1), null);
        assertEquals(201, response.getStatusCode().value());
        assertEquals("Japanese", response.getBody().getWord()); assertEquals(12L, response.getBody().getLessonId());
        verify(access).checkLesson(12L, null); verify(repository).save(response.getBody());
    }

    @Test
    @DisplayName("CRUD Vocab/UTC002: Reject duplicate create")
    void utc002() throws Exception {
        when(repository.existsByLessonIdAndWordIgnoreCase(12L, "Japanese")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> controller.create(12L, request("Japanese", "https://example.com/a.mp3", 1), null));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("CRUD Vocab/UTC003: Read vocabulary list")
    void utc003() throws Exception {
        var word = new Vocabulary(); var words = List.of(word);
        when(repository.findByLessonIdOrderByDisplayOrderAscIdAsc(12L)).thenReturn(words);
        when(access.visible(words, null, null)).thenReturn(words);
        assertEquals(words, controller.list(12L, null, null));
        var order = inOrder(access, repository); order.verify(access).checkLesson(12L, null);
        order.verify(repository).findByLessonIdOrderByDisplayOrderAscIdAsc(12L); order.verify(access).visible(words, null, null);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC004: Update vocabulary")
    void utc004() throws Exception {
        var word = new Vocabulary(); word.setId(5L); word.setLessonId(12L);
        when(access.require(repository, 5L)).thenReturn(word); when(repository.save(word)).thenReturn(word);
        var result = controller.update(5L, request(" Revised ", "https://example.com/a.mp3", 2));
        assertEquals(5L, result.getId()); assertEquals(12L, result.getLessonId()); assertEquals("Revised", result.getWord());
        assertEquals(2, result.getDisplayOrder()); verify(repository).save(word);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC005: Reject duplicate update")
    void utc005() throws Exception {
        var word = new Vocabulary(); word.setLessonId(12L); word.setWord("Original");
        when(access.require(repository, 5L)).thenReturn(word);
        when(repository.existsByLessonIdAndWordIgnoreCaseAndIdNot(12L, "Japanese", 5L)).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> controller.update(5L, request("Japanese", "https://example.com/a.mp3", 1)));
        assertEquals("Original", word.getWord()); verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("CRUD Vocab/UTC006: Archive vocabulary")
    void utc006() throws Exception {
        var word = new Vocabulary(); when(access.require(repository, 5L)).thenReturn(word);
        assertEquals(204, controller.archive(5L).getStatusCode().value()); assertEquals(Course.Status.ARCHIVED, word.getStatus());
        verify(repository).save(word); verify(repository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("CRUD Vocab/UTC007: Archive missing vocabulary")
    void utc007() throws Exception {
        when(repository.findById(404L)).thenReturn(Optional.empty());
        var realController = new VocabularyController(repository, service);
        var ex = assertThrows(ResponseStatusException.class, () -> realController.archive(404L));
        assertEquals(404, ex.getStatusCode().value()); verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("CRUD Vocab/UTC008: Validate word: valid text")
    void utc008() throws Exception {
        validation(request("Japanese", "https://example.com/a.mp3", 1), "word", true);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC009: Validate word: empty string")
    void utc009() throws Exception {
        validation(request("", "https://example.com/a.mp3", 1), "word", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC010: Validate word: null")
    void utc010() throws Exception {
        validation(request(null, "https://example.com/a.mp3", 1), "word", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC011: Validate word: 100 characters")
    void utc011() throws Exception {
        validation(request("a".repeat(100), "https://example.com/a.mp3", 1), "word", true);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC012: Validate word: 101 characters")
    void utc012() throws Exception {
        validation(request("a".repeat(101), "https://example.com/a.mp3", 1), "word", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC013: Validate audio URL")
    void utc013() throws Exception {
        validation(request("Japanese", "https://example.com/a.mp3", 1), "audioUrlValid", true);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC014: Validate audio URL")
    void utc014() throws Exception {
        validation(request("Japanese", "http://example.com/a.mp3", 1), "audioUrlValid", true);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC015: Validate audio URL")
    void utc015() throws Exception {
        validation(request("Japanese", "javascript:alert(1)", 1), "audioUrlValid", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC016: Validate audio URL")
    void utc016() throws Exception {
        validation(request("Japanese", "/relative.mp3", 1), "audioUrlValid", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC017: Validate audio URL")
    void utc017() throws Exception {
        validation(request("Japanese", "https://", 1), "audioUrlValid", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC018: Validate display order")
    void utc018() throws Exception {
        validation(request("Japanese", "https://example.com/a.mp3", 1), "displayOrder", true);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC019: Validate display order")
    void utc019() throws Exception {
        validation(request("Japanese", "https://example.com/a.mp3", 0), "displayOrder", true);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC020: Validate display order")
    void utc020() throws Exception {
        validation(request("Japanese", "https://example.com/a.mp3", -1), "displayOrder", false);
    }

    @Test
    @DisplayName("CRUD Vocab/UTC021: Validate display order")
    void utc021() throws Exception {
        validation(request("Japanese", "https://example.com/a.mp3", null), "displayOrder", false);
    }
}
