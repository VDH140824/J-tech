package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.VocabularyMiniTestRequest;
import com.jtech.entity.VocabularyMiniTest;
import com.jtech.entity.VocabularyMiniTestQuestion;
import com.jtech.repository.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class VocabularyMiniTestServiceTest {
    private final VocabularyMiniTestRepository tests = mock(VocabularyMiniTestRepository.class);
    private final VocabularyMiniTestQuestionRepository questions = mock(VocabularyMiniTestQuestionRepository.class);
    private final VocabularyMiniTestLinkRepository links = mock(VocabularyMiniTestLinkRepository.class);
    private final ObjectMapper json = new ObjectMapper();
    private final VocabularyMiniTestService service = new VocabularyMiniTestService(tests, questions, links, mock(VocabularyService.class), json, mock(VocabularyRepository.class));

    private VocabularyMiniTest test() {
        var test = new VocabularyMiniTest(); test.setId(1L); test.setLessonId(2L); test.setPassingScore(BigDecimal.valueOf(70));
        when(tests.findById(1L)).thenReturn(Optional.of(test)); when(tests.findForUpdate(1L)).thenReturn(Optional.of(test));
        return test;
    }
    private VocabularyMiniTestRequest.Question input(VocabularyMiniTestQuestion.Type type, List<String> options, String answer, Map<String, String> pairs) {
        return new VocabularyMiniTestRequest.Question(type, "日本語", "Giải thích", VocabularyMiniTestQuestion.Difficulty.EASY, options, answer, pairs);
    }
    @Test void rejectsDuplicateChoicesAndMissingCorrectAnswer() {
        assertThrows(IllegalArgumentException.class, () -> service.validateAnswer(input(VocabularyMiniTestQuestion.Type.MCQ, List.of("Ａ", "A"), "A", Map.of())));
        assertThrows(IllegalArgumentException.class, () -> service.validateAnswer(input(VocabularyMiniTestQuestion.Type.MCQ, List.of("A", "B"), "C", Map.of())));
        assertThrows(IllegalArgumentException.class, () -> service.validateAnswer(input(VocabularyMiniTestQuestion.Type.FILL_IN, List.of(), " ", Map.of())));
    }
    @Test void validatesMatchingPairsAndGradesIndependentOfPairOrder() {
        var data = service.validateAnswer(input(VocabularyMiniTestQuestion.Type.MATCHING, List.of(), "", Map.of("猫", "mèo", "犬", "chó")));
        assertTrue(service.matches(VocabularyMiniTestQuestion.Type.MATCHING, data, "{\"犬\":\"chó\",\"猫\":\"mèo\"}"));
        assertFalse(service.matches(VocabularyMiniTestQuestion.Type.MATCHING, data, "{\"猫\":\"chó\",\"犬\":\"mèo\"}"));
        assertFalse(service.matches(VocabularyMiniTestQuestion.Type.MATCHING, data, "invalid-json"));
        assertFalse(service.matches(VocabularyMiniTestQuestion.Type.MATCHING, data, "{\"猫\":\"mèo\"}"));
        assertThrows(IllegalArgumentException.class, () -> service.validateAnswer(input(VocabularyMiniTestQuestion.Type.MATCHING, List.of(), "", Map.of("猫", "mèo", "犬", "mèo"))));
    }
    @Test void fillInNormalizesWidthCaseAndWhitespaceButNotWrongWords() {
        var data = new VocabularyMiniTestService.AnswerData(List.of(), "API Test", Map.of());
        assertTrue(service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, data, " ＡＰＩ   test "));
        assertFalse(service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, data, "different"));
        assertFalse(service.matches(VocabularyMiniTestQuestion.Type.FILL_IN, data, null));
    }
    @Test void calculatesScoreOnServerAndTreatsMissingAnswersAsWrong() throws Exception {
        test();
        var data = json.writeValueAsString(new VocabularyMiniTestService.AnswerData(List.of(), "正解", Map.of()));
        List<VocabularyMiniTestQuestion> items = new ArrayList<>();
        for (long id = 1; id <= 5; id++) {
            var question = new VocabularyMiniTestQuestion(); question.setId(id); question.setQuestionType(VocabularyMiniTestQuestion.Type.FILL_IN); question.setAnswerData(data); items.add(question);
        }
        when(questions.findForTest(1L)).thenReturn(items);
        var result = service.preview(1L, Map.of("1", "正解", "2", "正解", "3", "正解", "4", "正解"));
        assertEquals(new BigDecimal("80.00"), result.score()); assertEquals(4, result.correctCount()); assertTrue(result.passed());
        assertThrows(IllegalArgumentException.class, () -> service.preview(1L, Map.of("999", "正解")));
    }
    @Test void refusesChangesAfterAttemptsAndKeepsHistory() {
        test(); when(tests.countAttempts(1L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.update(1L, null));
        verifyNoInteractions(links); verify(questions, never()).save(any());
    }
    @Test void archiveRejectsActiveAttemptsThenSoftDeletesWithoutRemovingQuestions() {
        var test = test(); when(tests.countActiveAttempts(1L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.archive(1L));
        when(tests.countActiveAttempts(1L)).thenReturn(0L); service.archive(1L);
        assertEquals(VocabularyMiniTest.Status.ARCHIVED, test.getStatus());
        verify(tests).save(test); verifyNoInteractions(links, questions);
    }
    @Test void cannotAccessAnotherSkillOrComprehensiveTestThroughVocabRoutes() {
        var test = test(); test.setSkill(VocabularyMiniTest.Skill.KANJI);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.get(1L));
        test.setSkill(VocabularyMiniTest.Skill.VOCABULARY); test.setTestType(VocabularyMiniTest.Type.LESSON_TEST);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> service.get(1L));
    }
}
