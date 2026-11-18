package com.jtech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.QuestionBankRequest;
import com.jtech.dto.response.QuestionBankResponse;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.QuestionBankQueryRepository;
import com.jtech.repository.QuestionBankRepository;
import com.jtech.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/** Unit test UC-39 Manage Question Bank (QB-01 tạo, QB-02 sửa, QB-03 xóa / lưu trữ, QB-04 đáp án). */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class QuestionBankServiceTest {

    private static final String EMAIL = "mod@fpt.edu.vn";

    @Mock private QuestionBankRepository questions;
    @Mock private QuestionBankQueryRepository queries;
    @Mock private UserRepository users;

    private final ObjectMapper json = new ObjectMapper();
    private QuestionBankService service;
    private Question stored;

    @BeforeEach
    void setUp() {
        service = new QuestionBankService(questions, queries, users, json);
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(User.builder().userId(7L).email(EMAIL).build()));
        when(questions.save(any(Question.class))).thenAnswer(inv -> {
            Question q = inv.getArgument(0);
            if (q.getId() == null) q.setId(50L);
            stored = q;
            return q;
        });
        when(questions.saveAndFlush(any(Question.class))).thenAnswer(inv -> stored = inv.getArgument(0));
        when(questions.findById(anyLong())).thenAnswer(inv -> Optional.ofNullable(stored));
        when(queries.findSummary(anyLong())).thenAnswer(inv -> Optional.of(summary(inv.getArgument(0))));
        when(queries.findLessonSkill(10L)).thenReturn(Optional.of("VOCABULARY"));
        when(queries.findLessonSkill(11L)).thenReturn(Optional.of("KANJI"));
        when(queries.findGrammarLesson(20L)).thenReturn(Optional.of(12L));
    }

    // ===================== helpers =====================

    private static QuestionBankResponse.Summary summary(long id) {
        return new QuestionBankResponse.Summary(id, Question.Skill.VOCABULARY, Question.QuestionType.MCQ,
                Question.Difficulty.EASY, Question.QuestionStatus.ACTIVE, "c", true, 1L, "N5", 2L, 1, "Ch1",
                10L, "Bài 1", null, LocalDateTime.now());
    }

    private static QuestionBankRequest mcq(Question.Skill skill, List<String> options, String correct) {
        return new QuestionBankRequest(skill, Question.QuestionType.MCQ, 10L, 20L, "  学生 nghĩa là gì?  ", " giải thích ",
                Question.Difficulty.EASY, null, options, correct, null);
    }

    private static QuestionBankRequest vocabMcq() {
        return mcq(Question.Skill.VOCABULARY, List.of("học sinh", "giáo viên", "bác sĩ"), "học sinh");
    }

    private static QuestionBankRequest withContent(QuestionBankRequest r, String content) {
        return new QuestionBankRequest(r.skill(), r.questionType(), r.lessonId(), r.grammarId(), content,
                r.explanation(), r.difficulty(), r.isExerciseQuestion(), r.options(), r.correctAnswer(), r.matches());
    }

    private Question existing(Question.Skill skill, String answerData) {
        Question q = new Question();
        q.setId(50L);
        q.setSkill(skill);
        q.setQuestionType(Question.QuestionType.MCQ);
        q.setLessonId(10L);
        q.setContent("cũ");
        q.setAnswerData(answerData);
        q.setDifficulty(Question.Difficulty.EASY);
        q.setIsExerciseQuestion(true);
        q.setStatus(Question.QuestionStatus.ACTIVE);
        q.setCreatedAt(LocalDateTime.now());
        stored = q;
        return q;
    }

    private static final String VOCAB_DATA =
            "{\"options\":[\"học sinh\",\"giáo viên\",\"bác sĩ\"],\"correctAnswer\":\"học sinh\",\"matches\":{},\"sourceVocabularyId\":9}";

    private static HttpStatus status(ResponseStatusException ex) {
        return HttpStatus.valueOf(ex.getStatusCode().value());
    }

    private ResponseStatusException assertStatus(HttpStatus expected, Runnable action) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, action::run);
        assertEquals(expected, status(ex));
        return ex;
    }

    // ===================== QB-01 create =====================

    @Test
    void QB01_UTCID01_createVocabularyMcq_savesGenericFormatAndAudit() throws Exception {
        QuestionBankResponse.Detail detail = service.create(vocabMcq(), EMAIL);

        assertEquals(50L, detail.summary().id());
        assertEquals("学生 nghĩa là gì?", stored.getContent());
        assertEquals("giải thích", stored.getExplanation());
        assertEquals(10L, stored.getLessonId());
        assertNull(stored.getGrammarId());
        assertEquals(Question.QuestionStatus.ACTIVE, stored.getStatus());
        assertEquals(7L, stored.getCreatedBy());
        assertFalse(stored.getIsExerciseQuestion()); // kiểm tra chương Từ vựng lấy câu có cờ FALSE
        JsonNode data = json.readTree(stored.getAnswerData());
        assertTrue(data.path("options").isArray());
        assertEquals("học sinh", data.path("correctAnswer").asText());
    }

    @Test
    void QB01_UTCID02_createGrammarMcq_savesLetterFormatAndGrammarLesson() throws Exception {
        service.create(mcq(Question.Skill.GRAMMAR, List.of("は", "が", "を", "に"), "を"), EMAIL);

        JsonNode data = json.readTree(stored.getAnswerData());
        assertEquals("を", data.path("options").path("C").asText());
        assertEquals("C", data.path("correctAnswer").asText());
        assertEquals(20L, stored.getGrammarId());
        assertEquals(12L, stored.getLessonId());
    }

    @Test
    void QB01_UTCID03_grammarMcqNeedsFourOptions() {
        assertStatus(HttpStatus.BAD_REQUEST,
                () -> service.create(mcq(Question.Skill.GRAMMAR, List.of("は", "が", "を"), "を"), EMAIL));
        verify(questions, never()).save(any());
    }

    @Test
    void QB01_UTCID04_lessonOfOtherSkill_rejected() {
        QuestionBankRequest kanjiOnVocabLesson = mcq(Question.Skill.KANJI, List.of("a", "b"), "a");
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(kanjiOnVocabLesson, EMAIL));
        assertTrue(ex.getReason().contains("Kanji"));
    }

    @Test
    void QB01_UTCID05_listeningOrConjugation_notInQuestionBank() {
        for (Question.Skill skill : List.of(Question.Skill.LISTENING, Question.Skill.CONJUGATION)) {
            ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST,
                    () -> service.create(mcq(skill, List.of("a", "b"), "a"), EMAIL));
            assertEquals(QuestionBankService.UNSUPPORTED_SKILL, ex.getReason());
        }
        verify(questions, never()).save(any());
    }

    @Test
    void QB01_UTCID06_correctAnswerNotInOptions_rejected() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(
                mcq(Question.Skill.VOCABULARY, List.of("a", "b"), "c"), EMAIL));
    }

    @Test
    void QB01_UTCID07_duplicateOptionsAfterNormalize_rejected() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(
                mcq(Question.Skill.VOCABULARY, List.of("ＡＢ", "ab"), "ab"), EMAIL));
    }

    @Test
    void QB01_UTCID08_matchingNeedsTwoPairs() {
        QuestionBankRequest r = new QuestionBankRequest(Question.Skill.KANJI, Question.QuestionType.MATCHING, 11L, null,
                "Nối", null, Question.Difficulty.MEDIUM, null, null, null, Map.of("山", "núi"));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
    }

    @Test
    void QB01_UTCID09_fillInWithoutAnswer_rejected() {
        QuestionBankRequest r = new QuestionBankRequest(Question.Skill.VOCABULARY, Question.QuestionType.FILL_IN, 10L,
                null, "Điền nghĩa", null, Question.Difficulty.HARD, null, null, "  ", null);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
    }

    @Test
    void QB01_UTCID10_createKanjiFillIn_trimsAnswer() throws Exception {
        QuestionBankRequest r = new QuestionBankRequest(Question.Skill.KANJI, Question.QuestionType.FILL_IN, 11L,
                null, "Cách đọc của 駅?", null, Question.Difficulty.HARD, false, null, " えき ", null);
        service.create(r, EMAIL);

        assertEquals(11L, stored.getLessonId());
        assertFalse(stored.getIsExerciseQuestion()); // câu ngân hàng là câu kiểm tra
        assertEquals("えき", json.readTree(stored.getAnswerData()).path("correctAnswer").asText());
    }

    @Test
    void QB01_UTCID11_grammarIsTestQuestion() {
        QuestionBankRequest r = new QuestionBankRequest(Question.Skill.GRAMMAR, Question.QuestionType.FILL_IN, null,
                20L, "あの かたは どなた（　）。", null, Question.Difficulty.MEDIUM, false, null, "ですか", null);
        service.create(r, EMAIL);

        assertFalse(stored.getIsExerciseQuestion());
        assertEquals(20L, stored.getGrammarId());
    }

    // ===================== QB-02 update (BR-29) =====================

    @Test
    void QB02_UTCID01_answerChangedAfterAttempts_blocked() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        when(queries.hasAttempts(50L)).thenReturn(true);
        QuestionBankRequest r = mcq(Question.Skill.VOCABULARY, List.of("học sinh", "giáo viên", "bác sĩ"), "giáo viên");

        ResponseStatusException ex = assertStatus(HttpStatus.CONFLICT, () -> service.update(50L, r, EMAIL));
        assertEquals(QuestionBankService.ANSWER_LOCKED, ex.getReason());
        verify(questions, never()).saveAndFlush(any());
    }

    @Test
    void QB02_UTCID02_contentOnlyAfterAttempts_allowedAndAnswerUntouched() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        when(queries.hasAttempts(50L)).thenReturn(true);

        service.update(50L, withContent(vocabMcq(), "Nội dung mới"), EMAIL);

        assertEquals("Nội dung mới", stored.getContent());
        assertEquals(VOCAB_DATA, stored.getAnswerData());
        assertEquals(7L, stored.getUpdatedBy());
    }

    @Test
    void QB02_UTCID03_answerChangedWithoutAttempts_savedAndKeepsExtraFields() throws Exception {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        when(queries.hasAttempts(50L)).thenReturn(false);

        service.update(50L, mcq(Question.Skill.VOCABULARY, List.of("học sinh", "sinh viên"), "sinh viên"), EMAIL);

        JsonNode data = json.readTree(stored.getAnswerData());
        assertEquals("sinh viên", data.path("correctAnswer").asText());
        assertEquals(9, data.path("sourceVocabularyId").asInt());
    }

    @Test
    void QB02_UTCID04_changeSkill_rejected() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.update(50L,
                mcq(Question.Skill.KANJI, List.of("a", "b"), "a"), EMAIL));
    }

    @Test
    void QB02_UTCID05_archivedQuestion_cannotBeEdited() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA).setStatus(Question.QuestionStatus.ARCHIVED);
        assertStatus(HttpStatus.CONFLICT, () -> service.update(50L, vocabMcq(), EMAIL));
    }

    @Test
    void QB02_UTCID06_update_keepsExistingMediaColumns() {
        Question q = existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        q.setMediaUrl("https://res.cloudinary.com/demo/image/upload/v1/old.png");
        q.setMediaPublicId("old");

        service.update(50L, withContent(vocabMcq(), "Nội dung mới"), EMAIL);

        assertEquals("old", stored.getMediaPublicId());
        assertEquals("https://res.cloudinary.com/demo/image/upload/v1/old.png", stored.getMediaUrl());
    }

    @Test
    void QB02_UTCID07_notFound() {
        stored = null;
        assertStatus(HttpStatus.NOT_FOUND, () -> service.update(99L, vocabMcq(), EMAIL));
    }

    // ===================== QB-03 delete / archive (BR-13) =====================

    @Test
    void QB03_UTCID01_noLearningData_deletedPermanently() {
        Question q = existing(Question.Skill.VOCABULARY, VOCAB_DATA);

        QuestionBankResponse.DeleteResult result = service.delete(50L, EMAIL);

        assertFalse(result.archived());
        verify(questions).delete(q);
    }

    @Test
    void QB03_UTCID02_attempted_archivedInsteadOfDeleted() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        when(queries.hasAttempts(50L)).thenReturn(true);

        QuestionBankResponse.DeleteResult result = service.delete(50L, EMAIL);

        assertTrue(result.archived());
        assertEquals(Question.QuestionStatus.ARCHIVED, stored.getStatus());
        assertEquals(7L, stored.getUpdatedBy());
        verify(questions, never()).delete(any());
    }

    @Test
    void QB03_UTCID03_inTest_archivedWithReason() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        when(queries.isInTest(50L)).thenReturn(true);

        QuestionBankResponse.DeleteResult result = service.delete(50L, EMAIL);

        assertTrue(result.archived());
        assertTrue(result.reason().contains("bài kiểm tra"));
        verify(questions, never()).delete(any());
    }

    @Test
    void QB03_UTCID04_archive_setsArchivedStatus() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);

        QuestionBankResponse.DeleteResult result = service.archive(50L, EMAIL);

        assertTrue(result.archived());
        assertEquals(Question.QuestionStatus.ARCHIVED, stored.getStatus());
    }

    @Test
    void QB03_UTCID05_conjugationQuestion_notInBank() {
        Question q = existing(Question.Skill.CONJUGATION, "{}");
        q.setConjugationFormId(3L);

        assertStatus(HttpStatus.NOT_FOUND, () -> service.delete(50L, EMAIL));
        assertStatus(HttpStatus.NOT_FOUND, () -> service.archive(50L, EMAIL));
        verify(questions, never()).delete(any());
    }

    @Test
    void QB03_UTCID06_detail_reportsRetentionReason() {
        existing(Question.Skill.VOCABULARY, VOCAB_DATA);
        when(queries.hasFeedback(50L)).thenReturn(true);

        QuestionBankResponse.Detail detail = service.detail(50L);

        assertFalse(detail.canDelete());
        assertTrue(detail.retentionReason().contains("phản hồi"));
        assertEquals(List.of("học sinh", "giáo viên", "bác sĩ"), detail.options());
    }

    // ===================== QB-04 answer data =====================

    @Test
    void QB04_UTCID01_readGrammarLetterFormat() {
        Question q = existing(Question.Skill.GRAMMAR,
                "{\"options\":{\"A\":\"は\",\"B\":\"が\",\"C\":\"を\",\"D\":\"に\"},\"correctAnswer\":\"B\"}");
        QuestionBankService.Answer answer = service.readAnswer(q);
        assertEquals(List.of("は", "が", "を", "に"), answer.options());
        assertEquals("が", answer.correctAnswer());
    }

    @Test
    void QB04_UTCID02_sameAnswer_ignoresWidthCaseAndSpaces() {
        var a = new QuestionBankService.Answer(List.of("ＡＢＣ", " x "), "ＡＢＣ", Map.of());
        var b = new QuestionBankService.Answer(List.of("abc", "X"), "abc", Map.of());
        assertTrue(QuestionBankService.sameAnswer(a, b));
    }
}
