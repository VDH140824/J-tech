package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.VocabularyExerciseGenerateRequest;
import com.jtech.dto.request.VocabularyExerciseRequest;
import com.jtech.entity.Course;
import com.jtech.entity.Vocabulary;
import com.jtech.entity.VocabularyTest;
import com.jtech.entity.VocabularyTestQuestion;
import com.jtech.repository.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

class VocabularyExerciseServiceTest {

    private final VocabularyTestRepository tests = mock(VocabularyTestRepository.class);
    private final VocabularyTestQuestionRepository questions = mock(
        VocabularyTestQuestionRepository.class
    );
    private final VocabularyTestQuestionLinkRepository links = mock(
        VocabularyTestQuestionLinkRepository.class
    );
    private final ObjectMapper json = new ObjectMapper();
    private final VocabularyRepository words = mock(VocabularyRepository.class);
    private final VocabularyExerciseService service = new VocabularyExerciseService(
        tests,
        questions,
        links,
        mock(VocabularyService.class),
        json,
        words
    );

    private VocabularyTest test() {
        var test = new VocabularyTest();
        test.setId(1L);
        test.setLessonId(2L);
        test.setDurationMinutes(10);
        test.setPassingScore(BigDecimal.valueOf(70));
        when(tests.findById(1L)).thenReturn(Optional.of(test));
        when(tests.findForUpdate(1L)).thenReturn(Optional.of(test));
        return test;
    }

    @Test
    void publishesOnlySelectedWordsIncludingDraftSourcesWithoutPublishingTheWords() {
        var first = word(10L, "mèo", Course.Status.PUBLISHED);
        var second = word(11L, "chó", Course.Status.DRAFT);
        var draft = word(12L, "chim", Course.Status.DRAFT);
        when(words.findByLessonIdOrderByDisplayOrderAscIdAsc(2L)).thenReturn(List.of(first, second, draft));
        service.generate(2L, new VocabularyExerciseGenerateRequest(
            "Exercise", "", 10, BigDecimal.valueOf(70), VocabularyTest.Status.PUBLISHED, List.of(10L, 11L)
        ), null);
        var saved = ArgumentCaptor.forClass(VocabularyTestQuestion.class);
        verify(questions, times(2)).saveAndFlush(saved.capture());
        assertEquals(List.of(10L, 11L), saved.getAllValues().stream()
            .map(question -> service.readAnswer(question).sourceVocabularyId()).toList());
        assertEquals(Course.Status.DRAFT, second.getStatus());
        verify(words, never()).save(any());
    }

    @Test
    void studentReceivesOnlyPublishedQuestionsAndGetsGradedAfterSubmitting() throws Exception {
        var exercise = test();
        when(tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
            2L, VocabularyTest.Type.EXERCISE, VocabularyTest.Skill.VOCABULARY
        )).thenReturn(List.of(exercise));
        assertThrows(ResponseStatusException.class, () -> service.studentExercise(2L, null));
        assertThrows(ResponseStatusException.class, () -> service.submitExercise(1L, List.of(8L), Map.of(), null));
        exercise.setStatus(VocabularyTest.Status.PUBLISHED);
        var question = new VocabularyTestQuestion();
        question.setId(8L);
        question.setQuestionType(VocabularyTestQuestion.Type.MCQ);
        question.setContent("猫");
        question.setExplanation("猫 nghĩa là mèo");
        question.setAnswerData(json.writeValueAsString(
            new VocabularyExerciseService.AnswerData(List.of("mèo", "chó"), "mèo", Map.of())
        ));
        when(questions.findForTest(1L)).thenReturn(List.of(question));
        var payload = json.valueToTree(service.studentExercise(2L, null)).get("questions").get(0);
        assertEquals(2, payload.get("options").size());
        assertFalse(payload.has("correctAnswer"));
        assertFalse(payload.has("explanation"));
        assertFalse(payload.has("matches"));
        assertThrows(IllegalStateException.class, () -> service.submitExercise(1L, List.of(7L), Map.of(), null));
        assertEquals(new BigDecimal("100.00"), service.submitExercise(1L, List.of(8L), Map.of("8", "mèo"), null).result().score());
        assertFalse(service.submitExercise(1L, List.of(8L), Map.of("8", "chó"), null).result().questions().getFirst().correct());
    }

    private Vocabulary word(Long id, String meaning, Course.Status status) {
        var word = new Vocabulary();
        word.setId(id);
        word.setWord("word " + id);
        word.setMeaningVi(meaning);
        word.setStatus(status);
        return word;
    }

    private VocabularyExerciseRequest.Question input(
        VocabularyTestQuestion.Type type,
        List<String> options,
        String answer,
        Map<String, String> pairs
    ) {
        return new VocabularyExerciseRequest.Question(
            type,
            "日本語",
            "Giải thích",
            VocabularyTestQuestion.Difficulty.EASY,
            options,
            answer,
            pairs
        );
    }

    @Test
    void rejectsDuplicateChoicesAndMissingCorrectAnswer() {
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAnswer(
                input(VocabularyTestQuestion.Type.MCQ, List.of("Ａ", "A"), "A", Map.of())
            )
        );
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAnswer(
                input(VocabularyTestQuestion.Type.MCQ, List.of("A", "B"), "C", Map.of())
            )
        );
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAnswer(
                input(VocabularyTestQuestion.Type.FILL_IN, List.of(), " ", Map.of())
            )
        );
    }

    @Test
    void validatesMatchingPairsAndGradesIndependentOfPairOrder() {
        var data = service.validateAnswer(
            input(
                VocabularyTestQuestion.Type.MATCHING,
                List.of(),
                "",
                Map.of("猫", "mèo", "犬", "chó")
            )
        );
        assertTrue(
            service.matches(
                VocabularyTestQuestion.Type.MATCHING,
                data,
                "{\"犬\":\"chó\",\"猫\":\"mèo\"}"
            )
        );
        assertFalse(
            service.matches(
                VocabularyTestQuestion.Type.MATCHING,
                data,
                "{\"猫\":\"chó\",\"犬\":\"mèo\"}"
            )
        );
        assertFalse(
            service.matches(VocabularyTestQuestion.Type.MATCHING, data, "invalid-json")
        );
        assertFalse(
            service.matches(VocabularyTestQuestion.Type.MATCHING, data, "{\"猫\":\"mèo\"}")
        );
        assertThrows(IllegalArgumentException.class, () ->
            service.validateAnswer(
                input(
                    VocabularyTestQuestion.Type.MATCHING,
                    List.of(),
                    "",
                    Map.of("猫", "mèo", "犬", "mèo")
                )
            )
        );
    }

    @Test
    void fillInNormalizesWidthCaseAndWhitespaceButNotWrongWords() {
        var data = new VocabularyExerciseService.AnswerData(List.of(), "API Test", Map.of());
        assertTrue(
            service.matches(VocabularyTestQuestion.Type.FILL_IN, data, " ＡＰＩ   test ")
        );
        assertFalse(service.matches(VocabularyTestQuestion.Type.FILL_IN, data, "different"));
        assertFalse(service.matches(VocabularyTestQuestion.Type.FILL_IN, data, null));
    }

    @Test
    void calculatesScoreOnServerAndTreatsMissingAnswersAsWrong() throws Exception {
        test();
        var data = json.writeValueAsString(
            new VocabularyExerciseService.AnswerData(List.of(), "正解", Map.of())
        );
        List<VocabularyTestQuestion> items = new ArrayList<>();
        for (long id = 1; id <= 5; id++) {
            var question = new VocabularyTestQuestion();
            question.setId(id);
            question.setQuestionType(VocabularyTestQuestion.Type.FILL_IN);
            question.setAnswerData(data);
            items.add(question);
        }
        when(questions.findForTest(1L)).thenReturn(items);
        var result = service.preview(
            1L,
            Map.of("1", "正解", "2", "正解", "3", "正解", "4", "正解")
        );
        assertEquals(new BigDecimal("80.00"), result.score());
        assertEquals(4, result.correctCount());
        assertTrue(result.passed());
        assertThrows(IllegalArgumentException.class, () ->
            service.preview(1L, Map.of("999", "正解"))
        );
    }

    @Test
    void refusesChangesAfterAttemptsAndKeepsHistory() {
        test();
        when(tests.countAttempts(1L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.update(1L, null));
        verifyNoInteractions(links);
        verify(questions, never()).save(any());
    }

    @Test
    void archiveRejectsActiveAttemptsThenSoftDeletesWithoutRemovingQuestions() {
        var test = test();
        when(tests.countActiveAttempts(1L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.archive(1L));
        when(tests.countActiveAttempts(1L)).thenReturn(0L);
        service.archive(1L);
        assertEquals(VocabularyTest.Status.ARCHIVED, test.getStatus());
        verify(tests).save(test);
        verifyNoInteractions(links, questions);
    }

    @Test
    void cannotAccessAnotherSkillOrComprehensiveTestThroughVocabRoutes() {
        var test = test();
        test.setSkill(VocabularyTest.Skill.KANJI);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
            service.get(1L)
        );
        test.setSkill(VocabularyTest.Skill.VOCABULARY);
        test.setTestType(VocabularyTest.Type.LESSON_TEST);
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () ->
            service.get(1L)
        );
    }
}
