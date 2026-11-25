package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.Question;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.security.Principal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

class StudentKanjiExerciseServiceTest {
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final EntityManager em = mock(EntityManager.class);
    private final FeedbackService access = mock(FeedbackService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final Principal p = () -> "student@example.com";
    private StudentKanjiExerciseService service;
    private TypedQuery<Question> query;

    @BeforeEach void setup() {
        service = new StudentKanjiExerciseService(db, em, access, mapper);
    }
    private void document() {
        when(db.queryForList(anyString(), eq(String.class), eq(7L)))
            .thenReturn(List.of("[{\"name\":\"Kanji.pdf\",\"url\":\"https://example.com/kanji.pdf\"}]"));
    }
    @SuppressWarnings("unchecked")
    private void bank(List<Question> questions) {
        query = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(Question.class))).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        when(query.getResultList()).thenReturn(questions);
    }
    private Question question(long id, Question.QuestionType type) throws Exception {
        var q = new Question(); q.setId(id); q.setQuestionType(type); q.setContent("日"); q.setExplanation("Giải thích");
        q.setAnswerData(mapper.writeValueAsString(new KanjiExerciseService.AnswerData(
            type == Question.QuestionType.MCQ ? List.of("nhật", "nguyệt") : List.of(),
            type == Question.QuestionType.MATCHING ? "" : "nhật",
            type == Question.QuestionType.MATCHING ? Map.of("日", "nhật", "月", "nguyệt") : Map.of())));
        return q;
    }

    @Test void returnsOnlyActiveExercisesForSelectedLessonWithoutAnswers() throws Exception {
        document(); bank(List.of(question(1, Question.QuestionType.MCQ), question(2, Question.QuestionType.MATCHING)));
        var questions = service.questions(p, 7L);
        assertEquals(2, questions.size());
        var matching = questions.stream().filter(q -> q.id() == 2L).findFirst().orElseThrow();
        assertEquals(Set.of("日", "月"), new HashSet<>(matching.leftItems()));
        assertEquals(Set.of("nhật", "nguyệt"), new HashSet<>(matching.rightItems()));
        String json = mapper.writeValueAsString(questions);
        assertFalse(json.contains("correctAnswer")); assertFalse(json.contains("explanation")); assertFalse(json.contains("matches"));
        verify(query).setParameter("lesson", 7L);
        verify(query).setParameter("skill", Question.Skill.KANJI);
        verify(query).setParameter("status", Question.QuestionStatus.ACTIVE);
        verify(em).createQuery(argThat(sql -> sql.contains("q.isExerciseQuestion=true")), eq(Question.class));
        verify(db).queryForList(argThat(sql -> sql.contains("l.status='PUBLISHED'") && sql.contains("ch.status='PUBLISHED'")
            && sql.contains("c.status='PUBLISHED'") && sql.contains("c.deleted_at IS NULL")), eq(String.class), eq(7L));
    }

    @Test void drawsFiveDistinctQuestionsAndGradesOnlyThoseQuestionsInOrder() throws Exception {
        document();
        var pool = new ArrayList<Question>();
        for (long id = 1; id <= 12; id++) pool.add(question(id, Question.QuestionType.MCQ));
        bank(pool);

        var ids = service.questions(p, 7L).stream().map(StudentKanjiExerciseService.ExerciseQuestion::id).toList();
        assertEquals(5, ids.size());
        assertEquals(5, new HashSet<>(ids).size());
        var answers = Map.of(ids.getFirst(), new StudentKanjiExerciseService.Answer("nhật", null));
        var result = service.submit(p, 7L, ids, answers);
        assertEquals(5, result.total());
        assertEquals(1, result.correctCount());
        assertEquals(ids, result.questions().stream().map(StudentKanjiExerciseService.Review::id).toList());
    }

    @Test void rejectsWrongRoundSizeAndIdsOutsideTheRound() throws Exception {
        document();
        var pool = new ArrayList<Question>();
        for (long id = 1; id <= 6; id++) pool.add(question(id, Question.QuestionType.MCQ));
        bank(pool);

        for (var ids : List.of(List.of(1L, 2L, 3L, 4L), List.of(1L, 2L, 3L, 4L, 5L, 6L),
                List.of(1L, 2L, 3L, 4L, 4L), List.of(1L, 2L, 3L, 4L, 99L))) {
            assertThrows(ResponseStatusException.class, () -> service.submit(p, 7L, ids, Map.of()));
        }
        var ids = List.of(1L, 2L, 3L, 4L, 5L);
        var answers = Map.of(6L, new StudentKanjiExerciseService.Answer("nhật", null));
        assertThrows(ResponseStatusException.class, () -> service.submit(p, 7L, ids, answers));
    }

    @Test void loadsSeededMultipleChoiceExerciseWithoutMatches() throws Exception {
        document();
        var question = question(1, Question.QuestionType.MCQ);
        question.setAnswerData("""
            {"options":["にほんじん","わたし"],"correctAnswer":"わたし"}
            """);
        bank(List.of(question));

        var exercise = service.questions(p, 7L).getFirst();
        assertEquals(List.of("にほんじん", "わたし"), exercise.options());
        assertTrue(exercise.leftItems().isEmpty());
        assertTrue(exercise.rightItems().isEmpty());
    }

    @Test void rejectsUnpublishedOrMissingLesson() {
        when(db.queryForList(anyString(), eq(String.class), eq(7L))).thenReturn(List.of());
        assertThrows(ResponseStatusException.class, () -> service.questions(p, 7L));
        verifyNoInteractions(em);
    }

    @Test void studentAuthorizationIsRequiredBeforeReadingContent() {
        when(access.actor(p, "STUDENT")).thenThrow(new AccessDeniedException("Forbidden"));
        assertThrows(AccessDeniedException.class, () -> service.questions(p, 7L));
        verifyNoInteractions(db, em);
    }

    @Test void legacySharedDocumentsNeverExposeUnassignedQuestions() {
        when(db.queryForList(anyString(), eq(String.class), eq(7L)))
            .thenReturn(List.of("[\"https://example.com/a.pdf\",\"https://example.com/b.pdf\"]"));
        assertTrue(service.questions(p, 7L).isEmpty());
        verifyNoInteractions(em);
    }

    @Test void gradesAllTypesAndNormalizesTextAfterSubmission() throws Exception {
        document(); bank(List.of(question(1, Question.QuestionType.MCQ), question(2, Question.QuestionType.FILL_IN), question(3, Question.QuestionType.MATCHING)));
        var result = service.submit(p, 7L, List.of(1L, 2L, 3L), Map.of(
            1L, new StudentKanjiExerciseService.Answer("NHẬT ", null),
            2L, new StudentKanjiExerciseService.Answer(" nhật ", null),
            3L, new StudentKanjiExerciseService.Answer(null, Map.of("日", "nhật", "月", "nguyệt"))));
        assertEquals(3, result.correctCount()); assertEquals(3, result.total());
        assertEquals("nhật", result.questions().getFirst().correctAnswer());
        assertEquals("Giải thích", result.questions().getFirst().explanation());
    }

    @Test void unansweredAndWrongMatchingAnswersAreIncorrect() throws Exception {
        document(); bank(List.of(question(1, Question.QuestionType.FILL_IN), question(2, Question.QuestionType.MATCHING)));
        var result = service.submit(p, 7L, List.of(1L, 2L), Map.of(2L, new StudentKanjiExerciseService.Answer(null, Map.of("日", "nguyệt", "月", "nhật"))));
        assertEquals(0, result.correctCount());
    }

    @Test void rejectsForeignChangedAndDuplicateQuestionIds() throws Exception {
        document(); bank(List.of(question(1, Question.QuestionType.MCQ)));
        for (var ids : List.of(List.of(99L), List.of(1L, 1L), List.<Long>of()))
            assertThrows(ResponseStatusException.class, () -> service.submit(p, 7L, ids, Map.of()));
        assertThrows(ResponseStatusException.class, () -> service.submit(p, 7L, List.of(1L), Map.of(99L, new StudentKanjiExerciseService.Answer("nhật", null))));
    }

    @Test void publishedDocumentWithNoQuestionsReturnsEmptyList() {
        document(); bank(List.of());
        assertTrue(service.questions(p, 7L).isEmpty());
    }
}
