package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.StudentConjugationResponse;
import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import com.jtech.entity.Question;
import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.ConjugationFormRepository;
import com.jtech.repository.LearningProgressRepository;
import com.jtech.repository.QuestionConjugationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/** UC-23: học viên lọc câu luyện tập theo nhóm động từ và độ khó. */
@ExtendWith(MockitoExtension.class)
class StudentConjugationServiceTest {

    @Mock private ConjugationFormRepository forms;
    @Mock private QuestionConjugationRepository questions;
    @Mock private LearningProgressRepository progress;
    @Mock private LearningActivityService activities;
    @Mock private CoinRewardService coins;
    @Mock private CoinTransactionRepository coinTransactions;

    private StudentConjugationService service;

    @BeforeEach
    void setUp() {
        service = new StudentConjugationService(forms, questions, progress, activities, coins, coinTransactions,
                new ObjectMapper());
    }

    private static Question question(long id, int verbGroup, Question.Difficulty difficulty) {
        Question q = new Question();
        q.setId(id);
        q.setConjugationFormId(1L);
        q.setStatus(Question.QuestionStatus.ACTIVE);
        q.setIsExerciseQuestion(true);
        q.setDifficulty(difficulty);
        q.setContent("Chia động từ V" + id + " sang thể te.");
        q.setAnswerData("{\"verb\":\"V" + id + "\",\"verbGroup\":" + verbGroup + ",\"correctAnswer\":\"A" + id + "\"}");
        return q;
    }

    private void givenPublishedFormWithQuestions() {
        ConjugationForm form = ConjugationForm.builder().id(1L).nameVi("Thể te").nameJp("て形")
                .questionsPerPractice(10).status(Course.Status.PUBLISHED).build();
        when(forms.findById(1L)).thenReturn(Optional.of(form));
        when(questions.findStudentPracticeQuestions(1L, Question.QuestionStatus.ACTIVE)).thenReturn(List.of(
                question(1, 1, Question.Difficulty.EASY),
                question(2, 1, Question.Difficulty.HARD),
                question(3, 2, Question.Difficulty.HARD),
                question(4, 2, Question.Difficulty.EASY)));
    }

    @Test
    void start_filtersByGroupAndDifficulty() {
        givenPublishedFormWithQuestions();

        StudentConjugationResponse.PracticeSession session = service.start(1L, 2, "HARD", "typed");

        assertEquals(1, session.questions().size());
        assertEquals(3L, session.questions().get(0).id());
        assertEquals("HARD", session.difficulty());
    }

    @Test
    void start_allDifficulties_keepsGroupFilterOnly() {
        givenPublishedFormWithQuestions();

        StudentConjugationResponse.PracticeSession session = service.start(1L, 1, "ALL", "choice");

        assertEquals(2, session.questions().size());
        assertTrue(session.questions().stream().allMatch(q -> q.verbGroup() == 1));
    }

    @Test
    void start_noQuestionForSelection_throws404() {
        givenPublishedFormWithQuestions();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.start(1L, 3, "EASY", "typed"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @Test
    void start_invalidDifficulty_throws400() {
        ConjugationForm form = ConjugationForm.builder().id(1L).status(Course.Status.PUBLISHED).build();
        when(forms.findById(1L)).thenReturn(Optional.of(form));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.start(1L, 0, "VERY_HARD", "typed"));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void answerData_writeThenRead_roundTrips() {
        ObjectMapper json = new ObjectMapper();
        Question q = new Question();
        q.setAnswerData(ConjugationAnswerData.write(json, "書く", "かく", "viết", 1, "書いて",
                List.of("かいて"), List.of("書きて")));

        ConjugationAnswerData.Data data = ConjugationAnswerData.read(q, json);

        assertEquals("書く", data.verb());
        assertEquals(1, data.verbGroup());
        assertEquals("書いて", data.correctAnswer());
        assertEquals(List.of("かいて"), data.acceptedAnswers());
        assertEquals(List.of("書きて"), data.options());
    }
}
