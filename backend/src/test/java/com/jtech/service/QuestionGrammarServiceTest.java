package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.QuestionGrammarCreateRequest;
import com.jtech.dto.request.QuestionGrammarUpdateRequest;
import com.jtech.dto.response.QuestionGrammarResponse;
import com.jtech.entity.Grammar;
import com.jtech.entity.Lesson;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.GrammarRepository;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.QuestionGrammarRepository;
import com.jtech.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Service requirements grouped by public function. Validation tests deliberately
 * assert the agreed requirements even where the current implementation lacks them.
 * No Spring context, database, network, or DTO validation is involved.
 */
@ExtendWith(MockitoExtension.class)
class QuestionGrammarServiceTest {
    private static final long LESSON_ID = 10L;
    private static final long GRAMMAR_ID = 20L;
    private static final long QUESTION_ID = 30L;
    private static final long USER_ID = 40L;
    private static final String EMAIL = "moderator@example.com";
    private static final String VALID_ANSWER =
            "{\"options\":{\"A\":\"猫\",\"B\":\"犬\",\"C\":\"鳥\",\"D\":\"魚\"},\"correctAnswer\":\"A\"}";
    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 1, 1, 9, 0);
    private static final LocalDateTime UPDATED_AT = CREATED_AT.plusDays(1);

    @Mock QuestionGrammarRepository questionRepository;
    @Mock UserRepository userRepository;
    @Mock LessonRepository lessonRepository;
    @Mock GrammarRepository grammarRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private QuestionGrammarService service;
    private Question existing;

    @BeforeEach
    void setUp() {
        service = new QuestionGrammarService(questionRepository, userRepository,
                lessonRepository, grammarRepository, objectMapper);
        existing = question(QUESTION_ID);
    }

    @Nested
    @DisplayName("getAllGrammarQuestions(grammarId)")
    class GetAllGrammarQuestions {
        @Test
        @DisplayName("Q-LIST-01/02: query the selected grammar, GRAMMAR/ACTIVE; empty result")
        void returnsEmptyListWithCorrectFilters() {
            when(grammarRepository.existsById(GRAMMAR_ID)).thenReturn(true);
            when(questionRepository.findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
                    GRAMMAR_ID, Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE)).thenReturn(List.of());

            assertTrue(service.getAllGrammarQuestions(GRAMMAR_ID).isEmpty());
            verify(questionRepository).findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
                    GRAMMAR_ID, Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE);
            verifyNoInteractions(userRepository, lessonRepository);
        }

        @Test
        @DisplayName("Q-LIST-03: map every response field and preserve repository order")
        void mapsAllFieldsAndPreservesOrder() {
            Question second = question(5L);
            second.setDisplayOrder(2);
            when(grammarRepository.existsById(GRAMMAR_ID)).thenReturn(true);
            when(questionRepository.findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
                    GRAMMAR_ID, Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE))
                    .thenReturn(List.of(existing, second));

            List<QuestionGrammarResponse> result = service.getAllGrammarQuestions(GRAMMAR_ID);

            assertEquals(List.of(QUESTION_ID, 5L), result.stream().map(QuestionGrammarResponse::id).toList());
            assertEquals(response(existing), result.get(0));
            assertEquals(response(second), result.get(1));
        }

        @Test
        @DisplayName("Q-LIST-04: nullable response fields are preserved")
        void mapsNullableFields() {
            existing.setMediaUrl(null);
            existing.setExplanation(null);
            existing.setUpdatedBy(null);
            existing.setUpdatedAt(null);
            when(grammarRepository.existsById(GRAMMAR_ID)).thenReturn(true);
            when(questionRepository.findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
                    GRAMMAR_ID, Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE))
                    .thenReturn(List.of(existing));

            assertEquals(List.of(response(existing)), service.getAllGrammarQuestions(GRAMMAR_ID));
        }
    }

    @Nested
    @DisplayName("createQuestionGrammar(request, userEmail)")
    class CreateQuestionGrammar {
        @Test
        @DisplayName("Q-CREATE-01: save normalized fields, grammar link, defaults and creator audit")
        void createsQuestionAndReturnsSavedEntity() {
            prepareCreate();
            Input input = input().withText("content", "  Nội dung câu hỏi  ")
                    .withText("explanation", "  Giải thích đáp án  ")
                    .withAnswer("  " + VALID_ANSWER + "  ");
            when(questionRepository.save(any(Question.class))).thenAnswer(invocation -> {
                Question saved = invocation.getArgument(0);
                saved.setId(99L);
                return saved;
            });
            LocalDateTime before = LocalDateTime.now();

            QuestionGrammarResponse result = create(input);
            LocalDateTime after = LocalDateTime.now();

            Question saved = savedQuestion();
            assertAll(
                    () -> assertEquals(Question.Skill.GRAMMAR, saved.getSkill()),
                    () -> assertEquals(Question.QuestionStatus.ACTIVE, saved.getStatus()),
                    () -> assertEquals(LESSON_ID, saved.getLessonId()),
                    () -> assertEquals(GRAMMAR_ID, saved.getGrammarId()),
                    () -> assertEquals("Nội dung câu hỏi", saved.getContent()),
                    () -> assertEquals("Giải thích đáp án", saved.getExplanation()),
                    () -> assertEquals(VALID_ANSWER, saved.getAnswerData()),
                    () -> assertEquals(1, saved.getDisplayOrder()),
                    () -> assertEquals(USER_ID, saved.getCreatedBy()),
                    () -> assertWithin(saved.getCreatedAt(), before, after),
                    () -> assertNull(saved.getUpdatedBy()),
                    () -> assertNull(saved.getUpdatedAt()),
                    () -> assertEquals(response(saved), result),
                    () -> assertEquals(99L, result.id()));
            verify(userRepository).findByEmail(EMAIL);
        }

        @ParameterizedTest(name = "{0} / {1} / exercise={2}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#questionVariants")
        @DisplayName("Q-CREATE-02: retain question type, difficulty and exercise flag")
        void retainsVariants(Question.QuestionType type, Question.Difficulty difficulty, boolean exercise) {
            prepareCreate();
            String answer = type == Question.QuestionType.MCQ ? VALID_ANSWER : "{\"custom\":[\"existing format\"]}";
            Input value = new Input(type, "Nội dung", "Giải thích", answer, difficulty, exercise, 1);

            QuestionGrammarResponse result = create(value);

            assertEquals(type, result.questionType());
            assertEquals(difficulty, result.difficulty());
            assertEquals(exercise, result.isExerciseQuestion());
        }

        @Test
        @DisplayName("Q-CREATE-03: missing user is denied without saving")
        void rejectsMissingUser() {
            prepareCreate();
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

            AccessDeniedException error = assertThrows(AccessDeniedException.class, () -> create(input()));

            assertEquals("User not found", error.getMessage());
            verify(questionRepository, never()).save(any());
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#invalidText")
        @DisplayName("Q-CREATE-04/05/06/08: required text and 101-character rejection")
        void rejectsInvalidText(String field, String description, String value) {
            prepareCreate();
            assertRejected(() -> create(input().withText(field, value)), null);
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#validText")
        @DisplayName("Q-CREATE-07/09: 100 characters, Vietnamese/Japanese and trimming")
        void acceptsTextBoundary(String field, String description, String value) {
            prepareCreate();
            QuestionGrammarResponse result = create(input().withText(field, value));
            assertEquals(value.trim(), field.equals("content") ? result.content() : result.explanation());
            assertEquals(response(savedQuestion()), result);
        }

        @ParameterizedTest
        @ValueSource(ints = {-1, 0, 65536})
        @DisplayName("Q-CREATE-10/12: reject display order outside 1..65535")
        void rejectsDisplayOrder(int order) {
            prepareCreate();
            assertRejected(() -> create(input().withOrder(order)), null);
        }

        @ParameterizedTest
        @ValueSource(ints = {1, 65535})
        @DisplayName("Q-CREATE-11: accept display order boundaries")
        void acceptsDisplayOrder(int order) {
            prepareCreate();
            assertEquals(order, create(input().withOrder(order)).displayOrder());
            assertEquals(order, savedQuestion().getDisplayOrder());
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#invalidAnswers")
        @DisplayName("Q-CREATE-13/15/17/18/19/21/24/26: reject invalid MCQ data")
        void rejectsInvalidAnswers(String description, String answer) {
            prepareCreate();
            assertRejected(() -> create(input().withAnswer(answer)), null);
        }

        @Test
        @DisplayName("Q-CREATE-14: malformed JSON retains parser cause")
        void rejectsMalformedJson() {
            prepareCreate();
            IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                    () -> create(input().withAnswer("{\"answer\":")));
            assertEquals("Answer data must be valid JSON", error.getMessage());
            assertInstanceOf(JsonProcessingException.class, error.getCause());
            verifyNoInteractions(userRepository);
            verify(questionRepository, never()).save(any());
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#validAnswers")
        @DisplayName("Q-CREATE-16/20/22/23/25: valid MCQ, per-answer 100 and unrestricted JSON total")
        void acceptsValidAnswers(String description, String answer, String expected) throws Exception {
            prepareCreate();
            QuestionGrammarResponse result = create(input().withAnswer(answer));
            assertEquals(objectMapper.readTree(expected), objectMapper.readTree(result.answerData()));
            assertEquals(result.answerData(), savedQuestion().getAnswerData());
        }

        @ParameterizedTest
        @EnumSource(value = Question.QuestionType.class, names = {"FILL_IN", "MATCHING"})
        @DisplayName("Q-CREATE-NONMCQ: preserve existing JSON format; no new answers/pairs schema")
        void acceptsExistingNonMcqJson(Question.QuestionType type) {
            prepareCreate();
            String json = "{\"custom\":[\"" + "あ".repeat(100) + "\",\"existing format\"]}";
            assertTrue(json.length() > 100);
            QuestionGrammarResponse result = create(input().withType(type).withAnswer("  " + json + "  "));
            assertEquals(json, result.answerData());
        }

        @ParameterizedTest
        @EnumSource(value = Question.QuestionType.class, names = {"FILL_IN", "MATCHING"})
        @DisplayName("Q-CREATE-NONMCQ-JSON: malformed non-MCQ JSON is rejected")
        void rejectsMalformedNonMcqJson(Question.QuestionType type) {
            prepareCreate();
            assertRejected(() -> create(input().withType(type).withAnswer("{")), null);
        }

        @Test
        @DisplayName("Q-CREATE-27: save failure propagates")
        void propagatesSaveFailure() {
            prepareCreate();
            DataIntegrityViolationException failure = new DataIntegrityViolationException("save failed");
            when(questionRepository.save(any())).thenThrow(failure);
            assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> create(input())));
        }
    }

    @Nested
    @DisplayName("updateQuestionGrammar(id, request, userEmail)")
    class UpdateQuestionGrammar {
        @Test
        @DisplayName("Q-UPDATE-01/02: update allowed fields/audit and preserve all other entity fields")
        void updatesAllowedFieldsOnly() {
            prepareUpdate();
            Map<String, Object> immutable = immutableFields(existing);
            Input value = new Input(Question.QuestionType.MCQ, "  Câu hỏi mới  ", "  Giải thích mới  ",
                    "  " + VALID_ANSWER + "  ", Question.Difficulty.HARD, true, 12);
            LocalDateTime before = LocalDateTime.now();

            QuestionGrammarResponse result = update(value);
            LocalDateTime after = LocalDateTime.now();

            assertAll(
                    () -> assertEquals(immutable, immutableFields(existing)),
                    () -> assertEquals("Câu hỏi mới", existing.getContent()),
                    () -> assertEquals("Giải thích mới", existing.getExplanation()),
                    () -> assertEquals(VALID_ANSWER, existing.getAnswerData()),
                    () -> assertEquals(Question.QuestionType.MCQ, existing.getQuestionType()),
                    () -> assertEquals(Question.Difficulty.HARD, existing.getDifficulty()),
                    () -> assertEquals(12, existing.getDisplayOrder()),
                    () -> assertEquals(USER_ID, existing.getUpdatedBy()),
                    () -> assertWithin(existing.getUpdatedAt(), before, after),
                    () -> assertSame(existing, savedQuestion()),
                    () -> assertEquals(response(existing), result));
            verify(userRepository).findByEmail(EMAIL);
        }

        @Test
        @DisplayName("Q-UPDATE-03: missing question is rejected")
        void rejectsMissingQuestion() {
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.empty());
            NoSuchElementException error = assertThrows(NoSuchElementException.class, () -> update(input()));
            assertEquals("Question not found", error.getMessage());
            verifyNoInteractions(userRepository, grammarRepository, lessonRepository);
            verify(questionRepository, never()).save(any());
        }

        @ParameterizedTest
        @EnumSource(value = Question.Skill.class, names = "GRAMMAR", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("Q-UPDATE-04: other question skills are rejected")
        void rejectsOtherSkills(Question.Skill skill) {
            existing.setSkill(skill);
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
            Map<String, Object> before = snapshot(existing);
            IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> update(input()));
            assertEquals("Question is not a grammar question", error.getMessage());
            assertEquals(before, snapshot(existing));
            verifyNoInteractions(userRepository);
            verify(questionRepository, never()).save(any());
        }

        @Test
        @DisplayName("Q-UPDATE-05: missing user leaves question unchanged")
        void rejectsMissingUser() {
            prepareUpdate();
            when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());
            Map<String, Object> before = snapshot(existing);
            assertAll(
                    () -> assertEquals("User not found", assertThrows(AccessDeniedException.class,
                            () -> update(input())).getMessage()),
                    () -> assertEquals(before, snapshot(existing)),
                    () -> verify(questionRepository, never()).save(any()));
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#invalidText")
        @DisplayName("Q-UPDATE-06/07/08/10: invalid text must not change or save entity")
        void rejectsInvalidText(String field, String description, String value) {
            prepareUpdate();
            assertRejected(() -> update(input().withText(field, value)), existing);
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#validText")
        @DisplayName("Q-UPDATE-09/11: 100 characters, Vietnamese/Japanese and trimming")
        void acceptsTextBoundary(String field, String description, String value) {
            prepareUpdate();
            QuestionGrammarResponse result = update(input().withText(field, value));
            assertEquals(value.trim(), field.equals("content") ? result.content() : result.explanation());
            assertEquals(response(savedQuestion()), result);
        }

        @ParameterizedTest
        @ValueSource(ints = {-1, 0, 65536})
        @DisplayName("Q-UPDATE-12/14: reject display order outside 1..65535")
        void rejectsDisplayOrder(int order) {
            prepareUpdate();
            assertRejected(() -> update(input().withOrder(order)), existing);
        }

        @ParameterizedTest
        @ValueSource(ints = {1, 65535})
        @DisplayName("Q-UPDATE-13: accept display order boundaries")
        void acceptsDisplayOrder(int order) {
            prepareUpdate();
            assertEquals(order, update(input().withOrder(order)).displayOrder());
            assertEquals(order, savedQuestion().getDisplayOrder());
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#invalidAnswers")
        @DisplayName("Q-UPDATE-15/17/19/20/21/23/26/28: invalid MCQ leaves entity unchanged")
        void rejectsInvalidAnswers(String description, String answer) {
            prepareUpdate();
            assertRejected(() -> update(input().withAnswer(answer)), existing);
        }

        @Test
        @DisplayName("Q-UPDATE-16: malformed JSON retains cause and does not mutate entity")
        void rejectsMalformedJson() {
            prepareUpdate();
            Map<String, Object> before = snapshot(existing);
            IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                    () -> update(input().withAnswer("{\"answer\":")));
            assertEquals("Answer data must be valid JSON", error.getMessage());
            assertInstanceOf(JsonProcessingException.class, error.getCause());
            assertEquals(before, snapshot(existing));
            verifyNoInteractions(userRepository);
            verify(questionRepository, never()).save(any());
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("com.jtech.service.QuestionGrammarServiceTest#validAnswers")
        @DisplayName("Q-UPDATE-18/22/24/25/27: valid MCQ and per-answer 100-character limit")
        void acceptsValidAnswers(String description, String answer, String expected) throws Exception {
            prepareUpdate();
            QuestionGrammarResponse result = update(input().withAnswer(answer));
            assertEquals(objectMapper.readTree(expected), objectMapper.readTree(result.answerData()));
            assertEquals(result.answerData(), savedQuestion().getAnswerData());
        }

        @ParameterizedTest
        @EnumSource(value = Question.QuestionType.class, names = {"FILL_IN", "MATCHING"})
        @DisplayName("Q-UPDATE-NONMCQ: preserve existing JSON format; no new answers/pairs schema")
        void acceptsExistingNonMcqJson(Question.QuestionType type) {
            prepareUpdate();
            String json = "{\"custom\":[\"" + "あ".repeat(100) + "\",\"existing format\"]}";
            assertTrue(json.length() > 100);
            QuestionGrammarResponse result = update(input().withType(type).withAnswer("  " + json + "  "));
            assertEquals(json, result.answerData());
            assertEquals(type, result.questionType());
        }

        @ParameterizedTest
        @EnumSource(value = Question.QuestionType.class, names = {"FILL_IN", "MATCHING"})
        @DisplayName("Q-UPDATE-NONMCQ-JSON: malformed non-MCQ JSON is rejected")
        void rejectsMalformedNonMcqJson(Question.QuestionType type) {
            prepareUpdate();
            assertRejected(() -> update(input().withType(type).withAnswer("{")), existing);
        }

        @Test
        @DisplayName("Q-UPDATE-29: archived grammar questions remain archived after editing")
        void updatesArchivedQuestionWithoutChangingStatus() {
            prepareUpdate();
            existing.setStatus(Question.QuestionStatus.ARCHIVED);
            assertEquals(Question.QuestionStatus.ARCHIVED, update(input()).status());
            verify(questionRepository).save(existing);
        }

        @Test
        @DisplayName("Q-UPDATE-30: save failure propagates")
        void propagatesSaveFailure() {
            prepareUpdate();
            DataIntegrityViolationException failure = new DataIntegrityViolationException("save failed");
            when(questionRepository.save(any())).thenThrow(failure);
            assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> update(input())));
        }
    }

    @Nested
    @DisplayName("deleteQuestionGrammar(id)")
    class DeleteQuestionGrammar {
        @Test
        @DisplayName("Q-DELETE-01: delete before flushing, once each")
        void deletesBeforeFlush() {
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
            service.deleteQuestionGrammar(QUESTION_ID);
            var ordered = inOrder(questionRepository);
            ordered.verify(questionRepository).findById(QUESTION_ID);
            ordered.verify(questionRepository).delete(existing);
            ordered.verify(questionRepository).flush();
            ordered.verifyNoMoreInteractions();
        }

        @Test
        @DisplayName("Q-DELETE-02: missing question is rejected")
        void rejectsMissingQuestion() {
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.empty());
            assertEquals("Question not found", assertThrows(NoSuchElementException.class,
                    () -> service.deleteQuestionGrammar(QUESTION_ID)).getMessage());
            verify(questionRepository, never()).delete(any());
            verify(questionRepository, never()).flush();
        }

        @ParameterizedTest
        @EnumSource(value = Question.Skill.class, names = "GRAMMAR", mode = EnumSource.Mode.EXCLUDE)
        @DisplayName("Q-DELETE-03: other skills cannot be deleted through grammar service")
        void rejectsOtherSkills(Question.Skill skill) {
            existing.setSkill(skill);
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
            assertEquals("Grammar question not found", assertThrows(NoSuchElementException.class,
                    () -> service.deleteQuestionGrammar(QUESTION_ID)).getMessage());
            verify(questionRepository, never()).delete(any());
            verify(questionRepository, never()).flush();
        }

        @Test
        @DisplayName("Q-DELETE-04: delete constraint failure propagates without flushing")
        void propagatesDeleteFailure() {
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
            DataIntegrityViolationException failure = new DataIntegrityViolationException("question in use");
            doThrow(failure).when(questionRepository).delete(existing);
            assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                    () -> service.deleteQuestionGrammar(QUESTION_ID)));
            verify(questionRepository, never()).flush();
        }

        @Test
        @DisplayName("Q-DELETE-05: flush constraint failure propagates")
        void propagatesFlushFailure() {
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
            DataIntegrityViolationException failure = new DataIntegrityViolationException("question in use");
            doThrow(failure).when(questionRepository).flush();
            assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                    () -> service.deleteQuestionGrammar(QUESTION_ID)));
            var ordered = inOrder(questionRepository);
            ordered.verify(questionRepository).delete(existing);
            ordered.verify(questionRepository).flush();
        }

        @Test
        @DisplayName("Q-DELETE-06: archived grammar questions can still be deleted")
        void deletesArchivedQuestion() {
            existing.setStatus(Question.QuestionStatus.ARCHIVED);
            when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
            service.deleteQuestionGrammar(QUESTION_ID);
            verify(questionRepository).delete(existing);
            verify(questionRepository).flush();
        }
    }

    // Sources use only the agreed 100/101 text boundaries, plus required-input cases.
    static Stream<Arguments> invalidText() {
        List<Arguments> cases = new ArrayList<>();
        for (String field : List.of("content", "explanation")) {
            cases.add(Arguments.of(field, "null", null));
            cases.add(Arguments.of(field, "empty", ""));
            cases.add(Arguments.of(field, "spaces", "   "));
            cases.add(Arguments.of(field, "tab", "\t"));
            cases.add(Arguments.of(field, "newline", "\n"));
            for (String letter : List.of("x", "ế", "あ")) {
                cases.add(Arguments.of(field, "101 " + letter, letter.repeat(101)));
            }
        }
        return cases.stream();
    }

    static Stream<Arguments> validText() {
        List<Arguments> cases = new ArrayList<>();
        for (String field : List.of("content", "explanation")) {
            for (String letter : List.of("x", "ế", "あ")) {
                cases.add(Arguments.of(field, "100 " + letter, letter.repeat(100)));
                cases.add(Arguments.of(field, "trim 100 " + letter, " \t" + letter.repeat(100) + "\n "));
            }
        }
        return cases.stream();
    }

    static Stream<Arguments> questionVariants() {
        List<Arguments> cases = new ArrayList<>();
        for (Question.QuestionType type : Question.QuestionType.values()) {
            for (Question.Difficulty difficulty : Question.Difficulty.values()) {
                for (boolean exercise : List.of(true, false)) {
                    cases.add(Arguments.of(type, difficulty, exercise));
                }
            }
        }
        return cases.stream();
    }

    static Stream<Arguments> invalidAnswers() {
        List<Arguments> cases = new ArrayList<>();
        cases.add(Arguments.of("answerData null", null));
        cases.add(Arguments.of("answerData empty", ""));
        cases.add(Arguments.of("answerData blank", " \t\n "));
        for (String json : List.of("null", "123", "true", "\"answer\"", "{}", "[]",
                "{\"correctAnswer\":\"A\"}", "{\"options\":[],\"correctAnswer\":\"A\"}")) {
            cases.add(Arguments.of("wrong MCQ structure: " + json, json));
        }
        for (String key : List.of("A", "B", "C", "D")) {
            Map<String, Object> missing = options();
            missing.remove(key);
            cases.add(Arguments.of("missing option " + key, mcq(missing, "A")));
            for (Object value : new Object[]{null, "", "   ", "\t", "\n", 123, true, Map.of("text", "answer"), List.of("answer")}) {
                Map<String, Object> invalid = options();
                invalid.put(key, value);
                cases.add(Arguments.of("option " + key + " invalid: " + String.valueOf(value), mcq(invalid, "A")));
            }
            for (String letter : List.of("x", "ế", "あ")) {
                Map<String, Object> tooLong = options();
                tooLong.put(key, letter.repeat(101));
                cases.add(Arguments.of("option " + key + " 101 " + letter, mcq(tooLong, "A")));
            }
        }
        cases.add(Arguments.of("missing correctAnswer", json(Map.of("options", options()))));
        for (Object correct : new Object[]{null, "", " ", "E", "a", 1, true, List.of("A"), Map.of("key", "A")}) {
            cases.add(Arguments.of("invalid correctAnswer: " + String.valueOf(correct), mcq(options(), correct)));
        }
        return cases.stream();
    }

    static Stream<Arguments> validAnswers() {
        List<Arguments> cases = new ArrayList<>();
        for (String key : List.of("A", "B", "C", "D")) {
            String ordinary = mcq(options(), key);
            cases.add(Arguments.of("correct answer " + key, ordinary, ordinary));
            for (String letter : List.of("x", "ế", "あ")) {
                Map<String, Object> boundary = options();
                boundary.put(key, letter.repeat(100));
                String expected = mcq(boundary, key);
                cases.add(Arguments.of("option " + key + " 100 " + letter, expected, expected));
                boundary.put(key, " \t" + letter.repeat(100) + "\n ");
                cases.add(Arguments.of("trim option " + key + " 100 " + letter, mcq(boundary, key), expected));
            }
        }
        Map<String, Object> all = options();
        all.replaceAll((key, value) -> "あ".repeat(100));
        String longJson = mcq(all, "D");
        cases.add(Arguments.of("all options 100; total JSON > 100", longJson, longJson));
        return cases.stream();
    }

    private void prepareCreate() {
        Lesson lesson = new Lesson();
        lesson.setId(LESSON_ID);
        lesson.setSkillType(Lesson.SkillType.GRAMMAR);
        Grammar grammar = Grammar.builder().id(GRAMMAR_ID).lesson(lesson).build();
        // Lenient lookups allow validation to move earlier without weakening no-save assertions.
        lenient().when(lessonRepository.findById(LESSON_ID)).thenReturn(Optional.of(lesson));
        lenient().when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.of(grammar));
        prepareUserAndSave();
    }

    private void prepareUpdate() {
        lenient().when(questionRepository.findById(QUESTION_ID)).thenReturn(Optional.of(existing));
        prepareUserAndSave();
    }

    private void prepareUserAndSave() {
        User user = new User();
        user.setUserId(USER_ID);
        user.setEmail(EMAIL);
        lenient().when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        // Returning the entity exposes accidental acceptance rather than a mock-induced mapping NPE.
        lenient().when(questionRepository.save(any(Question.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private QuestionGrammarResponse create(Input input) {
        return service.createQuestionGrammar(new QuestionGrammarCreateRequest(input.type(), LESSON_ID,
                GRAMMAR_ID, input.content(), input.explanation(), input.answer(), input.difficulty(),
                input.exercise(), input.order()), EMAIL);
    }

    private QuestionGrammarResponse update(Input input) {
        return service.updateQuestionGrammar(QUESTION_ID, new QuestionGrammarUpdateRequest(input.type(),
                input.content(), input.explanation(), input.answer(), input.difficulty(), input.order()), EMAIL);
    }

    private void assertRejected(Executable action, Question unchanged) {
        Map<String, Object> before = unchanged == null ? null : snapshot(unchanged);
        assertAll(
                () -> {
                    IllegalArgumentException error = assertThrows(IllegalArgumentException.class, action);
                    assertNotNull(error.getMessage());
                    assertFalse(error.getMessage().isBlank(), "Validation must identify invalid input");
                },
                () -> verify(questionRepository, never()).save(any()),
                () -> {
                    if (unchanged != null) assertEquals(before, snapshot(unchanged), "Rejected update must not mutate entity");
                });
    }

    private Question savedQuestion() {
        ArgumentCaptor<Question> captor = ArgumentCaptor.forClass(Question.class);
        verify(questionRepository).save(captor.capture());
        return captor.getValue();
    }

    private static void assertWithin(LocalDateTime value, LocalDateTime before, LocalDateTime after) {
        assertNotNull(value);
        assertFalse(value.isBefore(before));
        assertFalse(value.isAfter(after));
    }

    private static Question question(long id) {
        Question value = new Question();
        value.setId(id);
        value.setSkill(Question.Skill.GRAMMAR);
        value.setQuestionType(Question.QuestionType.FILL_IN);
        value.setLessonId(LESSON_ID);
        value.setGrammarId(GRAMMAR_ID);
        value.setListeningExerciseId(50L);
        value.setConjugationFormId(60L);
        value.setContent("Nội dung cũ");
        value.setMediaUrl("https://example.com/old.mp4");
        value.setMediaPublicId("old-video");
        value.setExplanation("Giải thích cũ");
        value.setAnswerData("{\"custom\":[\"old answer\"]}");
        value.setDifficulty(Question.Difficulty.EASY);
        value.setIsExerciseQuestion(false);
        value.setDisplayOrder(5);
        value.setStatus(Question.QuestionStatus.ACTIVE);
        value.setCreatedBy(70L);
        value.setUpdatedBy(80L);
        value.setCreatedAt(CREATED_AT);
        value.setUpdatedAt(UPDATED_AT);
        return value;
    }

    private static QuestionGrammarResponse response(Question value) {
        return new QuestionGrammarResponse(value.getId(), value.getSkill(), value.getQuestionType(),
                value.getLessonId(), value.getGrammarId(), value.getContent(), value.getMediaUrl(),
                value.getExplanation(), value.getAnswerData(), value.getDifficulty(), value.getIsExerciseQuestion(),
                value.getDisplayOrder(), value.getStatus(), value.getCreatedBy(), value.getUpdatedBy(),
                value.getCreatedAt(), value.getUpdatedAt());
    }

    private static Map<String, Object> immutableFields(Question value) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("id", value.getId());
        fields.put("skill", value.getSkill());
        fields.put("lessonId", value.getLessonId());
        fields.put("grammarId", value.getGrammarId());
        fields.put("listeningExerciseId", value.getListeningExerciseId());
        fields.put("conjugationFormId", value.getConjugationFormId());
        fields.put("mediaUrl", value.getMediaUrl());
        fields.put("mediaPublicId", value.getMediaPublicId());
        fields.put("exercise", value.getIsExerciseQuestion());
        fields.put("status", value.getStatus());
        fields.put("createdBy", value.getCreatedBy());
        fields.put("createdAt", value.getCreatedAt());
        return fields;
    }

    private static Map<String, Object> snapshot(Question value) {
        Map<String, Object> fields = immutableFields(value);
        fields.put("type", value.getQuestionType());
        fields.put("content", value.getContent());
        fields.put("explanation", value.getExplanation());
        fields.put("answer", value.getAnswerData());
        fields.put("difficulty", value.getDifficulty());
        fields.put("order", value.getDisplayOrder());
        fields.put("updatedBy", value.getUpdatedBy());
        fields.put("updatedAt", value.getUpdatedAt());
        return fields;
    }

    private static Map<String, Object> options() {
        return new LinkedHashMap<>(Map.of("A", "猫", "B", "犬", "C", "鳥", "D", "魚"));
    }

    private static String mcq(Map<String, Object> options, Object correct) {
        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("options", options);
        answer.put("correctAnswer", correct);
        return json(answer);
    }

    private static String json(Object value) {
        try {
            return new ObjectMapper().writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new AssertionError("Invalid test fixture", exception);
        }
    }

    private static Input input() {
        return new Input(Question.QuestionType.MCQ, "Nội dung", "Giải thích", VALID_ANSWER,
                Question.Difficulty.MEDIUM, true, 1);
    }

    private record Input(Question.QuestionType type, String content, String explanation, String answer,
                         Question.Difficulty difficulty, boolean exercise, int order) {
        Input withText(String field, String value) {
            return new Input(type, field.equals("content") ? value : content,
                    field.equals("explanation") ? value : explanation, answer, difficulty, exercise, order);
        }

        Input withAnswer(String value) {
            return new Input(type, content, explanation, value, difficulty, exercise, order);
        }

        Input withOrder(int value) {
            return new Input(type, content, explanation, answer, difficulty, exercise, value);
        }

        Input withType(Question.QuestionType value) {
            return new Input(value, content, explanation, answer, difficulty, exercise, order);
        }
    }
}
