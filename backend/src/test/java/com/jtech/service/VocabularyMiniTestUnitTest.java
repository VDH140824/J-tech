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

/** One method per column in the Vocab MiniTest report sheet. */
class VocabularyMiniTestUnitTest {

    private final VocabularyMiniTestRepository tests = mock(VocabularyMiniTestRepository.class);
    private final VocabularyMiniTestQuestionRepository questions = mock(VocabularyMiniTestQuestionRepository.class);
    private final VocabularyMiniTestLinkRepository links = mock(VocabularyMiniTestLinkRepository.class);
    private final ObjectMapper json = new ObjectMapper();
    private final VocabularyMiniTestService service = new VocabularyMiniTestService(tests, questions, links, mock(VocabularyService.class), json, mock(VocabularyRepository.class));
    private VocabularyMiniTest test() {
        var t = new VocabularyMiniTest(); t.setId(1L); t.setLessonId(2L); t.setPassingScore(new BigDecimal("70"));
        when(tests.findById(1L)).thenReturn(Optional.of(t)); when(tests.findForUpdate(1L)).thenReturn(Optional.of(t)); return t;
    }
    private void fiveQuestions() throws Exception {
        test(); var data = json.writeValueAsString(new VocabularyMiniTestService.AnswerData(List.of(), "correct", Map.of()));
        var list = new ArrayList<VocabularyMiniTestQuestion>();
        for (long id=1; id<=5; id++) { var q=new VocabularyMiniTestQuestion(); q.setId(id); q.setQuestionType(VocabularyMiniTestQuestion.Type.FILL_IN); q.setAnswerData(data); list.add(q); }
        when(questions.findForTest(1L)).thenReturn(list);
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC001: Validate generation duration")
    void utc001() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory.getValidator().validate(new VocabularyMiniTestGenerateRequest("Test", "", 10, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT));
            assertTrue(v.isEmpty());
        }
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC002: Validate generation duration")
    void utc002() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory.getValidator().validate(new VocabularyMiniTestGenerateRequest("Test", "", 5, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT));
            assertTrue(v.isEmpty());
        }
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC003: Validate generation duration")
    void utc003() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory.getValidator().validate(new VocabularyMiniTestGenerateRequest("Test", "", 30, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT));
            assertTrue(v.isEmpty());
        }
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC004: Validate generation duration")
    void utc004() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory.getValidator().validate(new VocabularyMiniTestGenerateRequest("Test", "", 4, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT));
            assertFalse(v.isEmpty()); assertTrue(v.stream().anyMatch(x -> x.getPropertyPath().toString().equals("durationMinutes")));
        }
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC005: Validate generation duration")
    void utc005() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory.getValidator().validate(new VocabularyMiniTestGenerateRequest("Test", "", 31, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT));
            assertFalse(v.isEmpty()); assertTrue(v.stream().anyMatch(x -> x.getPropertyPath().toString().equals("durationMinutes")));
        }
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC006: Validate generation duration")
    void utc006() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory.getValidator().validate(new VocabularyMiniTestGenerateRequest("Test", "", null, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT));
            assertFalse(v.isEmpty()); assertTrue(v.stream().anyMatch(x -> x.getPropertyPath().toString().equals("durationMinutes")));
        }
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC007: Grade fill-in answer")
    void utc007() throws Exception {
        var answer = new VocabularyMiniTestService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(true, service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, answer, "API Test"));
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC008: Grade fill-in answer")
    void utc008() throws Exception {
        var answer = new VocabularyMiniTestService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(true, service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, answer, " ＡＰＩ   test "));
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC009: Grade fill-in answer")
    void utc009() throws Exception {
        var answer = new VocabularyMiniTestService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(false, service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, answer, "different"));
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC010: Grade fill-in answer")
    void utc010() throws Exception {
        var answer = new VocabularyMiniTestService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(false, service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, answer, null));
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC011: Calculate preview score")
    void utc011() throws Exception {
        fiveQuestions(); var answers = new HashMap<String,String>();
        for (int i=1; i<=5; i++) answers.put(String.valueOf(i), "correct");
        var result = service.preview(1L, answers); assertEquals(new BigDecimal("100.00"), result.score());
        assertEquals(5, result.correctCount()); assertEquals(true, result.passed());
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC012: Calculate preview score")
    void utc012() throws Exception {
        fiveQuestions(); var answers = new HashMap<String,String>();
        for (int i=1; i<=4; i++) answers.put(String.valueOf(i), "correct");
        var result = service.preview(1L, answers); assertEquals(new BigDecimal("80.00"), result.score());
        assertEquals(4, result.correctCount()); assertEquals(true, result.passed());
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC013: Calculate preview score")
    void utc013() throws Exception {
        fiveQuestions(); var answers = new HashMap<String,String>();
        for (int i=1; i<=0; i++) answers.put(String.valueOf(i), "correct");
        var result = service.preview(1L, answers); assertEquals(new BigDecimal("0.00"), result.score());
        assertEquals(0, result.correctCount()); assertEquals(false, result.passed());
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC014: Reject answer outside test")
    void utc014() throws Exception {
        fiveQuestions(); assertThrows(IllegalArgumentException.class, () -> service.preview(1L, Map.of("999", "correct")));
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC015: Archive mini-test")
    void utc015() throws Exception {
        var t = test(); when(tests.countActiveAttempts(1L)).thenReturn(0L);
        service.archive(1L); assertEquals(VocabularyMiniTest.Status.ARCHIVED, t.getStatus()); verify(tests).save(t);
        verifyNoInteractions(links, questions);
    }

    @Test
    @DisplayName("Vocab MiniTest/UTC016: Archive mini-test")
    void utc016() throws Exception {
        var t = test(); when(tests.countActiveAttempts(1L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.archive(1L)); verify(tests, never()).save(any());
        verifyNoInteractions(links, questions);
    }
}
