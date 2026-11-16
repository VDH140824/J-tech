package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.controller.VocabularyController;
import com.jtech.dto.request.*;
import com.jtech.entity.*;
import com.jtech.repository.*;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

/** One method per column in the Vocabulary Exercise report sheet. */
class VocabularyExerciseUnitTest {

    private final VocabularyTestRepository tests = mock(VocabularyTestRepository.class);
    private final VocabularyTestQuestionRepository questions = mock(
        VocabularyTestQuestionRepository.class
    );
    private final VocabularyTestQuestionLinkRepository links = mock(
        VocabularyTestQuestionLinkRepository.class
    );
    private final ObjectMapper json = new ObjectMapper();
    private final VocabularyExerciseService service = new VocabularyExerciseService(
        tests,
        questions,
        links,
        mock(VocabularyService.class),
        json,
        mock(VocabularyRepository.class)
    );

    private VocabularyTest test() {
        var t = new VocabularyTest();
        t.setId(1L);
        t.setLessonId(2L);
        t.setPassingScore(new BigDecimal("70"));
        when(tests.findById(1L)).thenReturn(Optional.of(t));
        when(tests.findForUpdate(1L)).thenReturn(Optional.of(t));
        return t;
    }

    private void fiveQuestions() throws Exception {
        test();
        var data = json.writeValueAsString(
            new VocabularyExerciseService.AnswerData(List.of(), "correct", Map.of())
        );
        var list = new ArrayList<VocabularyTestQuestion>();
        for (long id = 1; id <= 5; id++) {
            var q = new VocabularyTestQuestion();
            q.setId(id);
            q.setQuestionType(VocabularyTestQuestion.Type.FILL_IN);
            q.setAnswerData(data);
            list.add(q);
        }
        when(questions.findForTest(1L)).thenReturn(list);
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC001: Validate generation duration")
    void utc001() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory
                .getValidator()
                .validate(
                    new VocabularyExerciseGenerateRequest(
                        "Test",
                        "",
                        10,
                        new BigDecimal("70"),
                        VocabularyTest.Status.DRAFT,
                        List.of(1L, 2L)
                    )
                );
            assertTrue(v.isEmpty());
        }
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC002: Validate generation duration")
    void utc002() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory
                .getValidator()
                .validate(
                    new VocabularyExerciseGenerateRequest(
                        "Test",
                        "",
                        5,
                        new BigDecimal("70"),
                        VocabularyTest.Status.DRAFT,
                        List.of(1L, 2L)
                    )
                );
            assertTrue(v.isEmpty());
        }
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC003: Validate generation duration")
    void utc003() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory
                .getValidator()
                .validate(
                    new VocabularyExerciseGenerateRequest(
                        "Test",
                        "",
                        30,
                        new BigDecimal("70"),
                        VocabularyTest.Status.DRAFT,
                        List.of(1L, 2L)
                    )
                );
            assertTrue(v.isEmpty());
        }
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC004: Validate generation duration")
    void utc004() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory
                .getValidator()
                .validate(
                    new VocabularyExerciseGenerateRequest(
                        "Test",
                        "",
                        4,
                        new BigDecimal("70"),
                        VocabularyTest.Status.DRAFT,
                        List.of(1L, 2L)
                    )
                );
            assertFalse(v.isEmpty());
            assertTrue(
                v.stream().anyMatch(x -> x.getPropertyPath().toString().equals("durationMinutes"))
            );
        }
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC005: Validate generation duration")
    void utc005() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory
                .getValidator()
                .validate(
                    new VocabularyExerciseGenerateRequest(
                        "Test",
                        "",
                        31,
                        new BigDecimal("70"),
                        VocabularyTest.Status.DRAFT,
                        List.of(1L, 2L)
                    )
                );
            assertFalse(v.isEmpty());
            assertTrue(
                v.stream().anyMatch(x -> x.getPropertyPath().toString().equals("durationMinutes"))
            );
        }
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC006: Validate generation duration")
    void utc006() throws Exception {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var v = factory
                .getValidator()
                .validate(
                    new VocabularyExerciseGenerateRequest(
                        "Test",
                        "",
                        null,
                        new BigDecimal("70"),
                        VocabularyTest.Status.DRAFT,
                        List.of(1L, 2L)
                    )
                );
            assertFalse(v.isEmpty());
            assertTrue(
                v.stream().anyMatch(x -> x.getPropertyPath().toString().equals("durationMinutes"))
            );
        }
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC007: Grade fill-in answer")
    void utc007() throws Exception {
        var answer = new VocabularyExerciseService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(
            true,
            service.matches(VocabularyTestQuestion.Type.FILL_IN, answer, "API Test")
        );
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC008: Grade fill-in answer")
    void utc008() throws Exception {
        var answer = new VocabularyExerciseService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(
            true,
            service.matches(VocabularyTestQuestion.Type.FILL_IN, answer, " ＡＰＩ   test ")
        );
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC009: Grade fill-in answer")
    void utc009() throws Exception {
        var answer = new VocabularyExerciseService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(
            false,
            service.matches(VocabularyTestQuestion.Type.FILL_IN, answer, "different")
        );
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC010: Grade fill-in answer")
    void utc010() throws Exception {
        var answer = new VocabularyExerciseService.AnswerData(List.of(), "API Test", Map.of());
        assertEquals(false, service.matches(VocabularyTestQuestion.Type.FILL_IN, answer, null));
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC011: Calculate preview score")
    void utc011() throws Exception {
        fiveQuestions();
        var answers = new HashMap<String, String>();
        for (int i = 1; i <= 5; i++) answers.put(String.valueOf(i), "correct");
        var result = service.preview(1L, answers);
        assertEquals(new BigDecimal("100.00"), result.score());
        assertEquals(5, result.correctCount());
        assertEquals(true, result.passed());
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC012: Calculate preview score")
    void utc012() throws Exception {
        fiveQuestions();
        var answers = new HashMap<String, String>();
        for (int i = 1; i <= 4; i++) answers.put(String.valueOf(i), "correct");
        var result = service.preview(1L, answers);
        assertEquals(new BigDecimal("80.00"), result.score());
        assertEquals(4, result.correctCount());
        assertEquals(true, result.passed());
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC013: Calculate preview score")
    void utc013() throws Exception {
        fiveQuestions();
        var answers = new HashMap<String, String>();
        for (int i = 1; i <= 0; i++) answers.put(String.valueOf(i), "correct");
        var result = service.preview(1L, answers);
        assertEquals(new BigDecimal("0.00"), result.score());
        assertEquals(0, result.correctCount());
        assertEquals(false, result.passed());
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC014: Reject answer outside test")
    void utc014() throws Exception {
        fiveQuestions();
        assertThrows(IllegalArgumentException.class, () ->
            service.preview(1L, Map.of("999", "correct"))
        );
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC015: Archive exercise")
    void utc015() throws Exception {
        var t = test();
        when(tests.countActiveAttempts(1L)).thenReturn(0L);
        service.archive(1L);
        assertEquals(VocabularyTest.Status.ARCHIVED, t.getStatus());
        verify(tests).save(t);
        verifyNoInteractions(links, questions);
    }

    @Test
    @DisplayName("Vocabulary Exercise/UTC016: Archive exercise")
    void utc016() throws Exception {
        var t = test();
        when(tests.countActiveAttempts(1L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.archive(1L));
        verify(tests, never()).save(any());
        verifyNoInteractions(links, questions);
    }
}
