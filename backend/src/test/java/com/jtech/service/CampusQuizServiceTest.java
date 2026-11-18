package com.jtech.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.campus.CampusQuizSessionStore;
import com.jtech.campus.CampusQuizSessionStore.QuestionSnapshot;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizQuestion;
import com.jtech.dto.campusquiz.CampusQuizDtos.StartResponse;
import com.jtech.entity.Course;
import com.jtech.repository.CampusQuizQuestionRepository;
import com.jtech.repository.CampusQuizQuestionRepository.Candidate;
import com.jtech.repository.CourseRepository;
import com.jtech.service.CampusQuizService.QuizException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class CampusQuizServiceTest {
    private static final long COURSE_ID = 1L;
    private static final long STUDENT_ID = 2L;
    private static final int QUESTION_COUNT = 50;
    private static final String ANSWER_DATA = """
        {"options":["Incorrect","Correct"],"correctAnswer":"Correct"}
        """;

    @Mock private CourseRepository courses;
    @Mock private CampusQuizQuestionRepository questions;
    @Mock private CampusQuizRewardService rewards;
    @Spy private CampusQuizSessionStore sessions = new CampusQuizSessionStore();
    @Captor private ArgumentCaptor<List<QuestionSnapshot>> snapshots;

    private CampusQuizService service;

    @BeforeEach
    void setUp() {
        service = new CampusQuizService(courses, questions, sessions, rewards, new ObjectMapper(), 60);
    }

    @Test
    @DisplayName("UTCID01 - Course does not exist")
    void rejectsMissingCourse() {
        when(courses.findByIdAndStatus(COURSE_ID, Course.Status.PUBLISHED)).thenReturn(Optional.empty());

        assertCourseUnavailable();
    }

    @Test
    @DisplayName("UTCID02 - Course is a draft")
    void rejectsDraftCourse() {
        givenRepositoryCourse(Course.Status.DRAFT, null);

        assertCourseUnavailable();
    }

    @Test
    @DisplayName("UTCID03 - Course is soft-deleted")
    void rejectsSoftDeletedCourse() {
        givenRepositoryCourse(Course.Status.PUBLISHED, LocalDateTime.of(2026, 11, 18, 9, 0));

        assertCourseUnavailable();
    }

    @Test
    @DisplayName("UTCID04 - No eligible questions")
    void rejectsAnEmptyQuestionPool() {
        givenEligibleQuestions(List.of());

        assertInsufficientQuestions(0);
    }

    @Test
    @DisplayName("UTCID05 - Fewer than 50 eligible questions")
    void rejectsFortyNineQuestions() {
        givenEligibleQuestions(candidates(49));

        assertInsufficientQuestions(49);
    }

    @Test
    @DisplayName("UTCID06 - Exactly 50 eligible questions")
    void startsWithEveryQuestionWhenThereAreExactlyFifty() {
        List<Candidate> pool = candidates(QUESTION_COUNT);
        givenEligibleQuestions(pool);

        StartResponse response = service.startQuiz(COURSE_ID, STUDENT_ID);

        assertCreatedQuiz(response, pool);
        assertThat(response.questions()).extracting(QuizQuestion::id)
            .containsExactlyInAnyOrderElementsOf(pool.stream().map(Candidate::id).toList());
    }

    @Test
    @DisplayName("UTCID07 - More than 50 eligible questions")
    void selectsFiftyDistinctQuestionsFromALargerPool() {
        List<Candidate> pool = candidates(60);
        givenEligibleQuestions(pool);

        StartResponse response = service.startQuiz(COURSE_ID, STUDENT_ID);

        assertCreatedQuiz(response, pool);
    }

    @Test
    @DisplayName("UTCID08 - Duplicate question IDs leave fewer than 50 distinct questions")
    void rejectsFiftyCandidateRowsWithOnlyFortyNineDistinctIds() {
        var pool = new ArrayList<>(candidates(49));
        pool.add(pool.getFirst());
        givenEligibleQuestions(pool);

        assertInsufficientQuestions(49);
    }

    private void givenRepositoryCourse(Course.Status status, LocalDateTime deletedAt) {
        var course = new Course();
        course.setId(COURSE_ID);
        course.setStatus(status);
        course.setDeletedAt(deletedAt);
        // Model the repository's status filter and Course's Hibernate soft-delete restriction.
        when(courses.findByIdAndStatus(eq(COURSE_ID), any(Course.Status.class))).thenAnswer(invocation -> {
            Course.Status requestedStatus = invocation.getArgument(1);
            return course.getStatus() == requestedStatus && course.getDeletedAt() == null
                ? Optional.of(course)
                : Optional.empty();
        });
    }

    private void givenEligibleQuestions(List<Candidate> pool) {
        givenRepositoryCourse(Course.Status.PUBLISHED, null);
        when(questions.findEligibleQuestionsByCourseId(COURSE_ID)).thenReturn(pool);
    }

    private void assertCourseUnavailable() {
        QuizException exception = assertThrows(QuizException.class, () -> service.startQuiz(COURSE_ID, STUDENT_ID));

        assertThat(exception.status()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.error().code()).isEqualTo("COURSE_UNAVAILABLE");
        verify(courses).findByIdAndStatus(COURSE_ID, Course.Status.PUBLISHED);
        verifyNoMoreInteractions(courses);
        verifyNoInteractions(questions, sessions, rewards);
    }

    private void assertInsufficientQuestions(int availableCount) {
        QuizException exception = assertThrows(QuizException.class, () -> service.startQuiz(COURSE_ID, STUDENT_ID));

        assertThat(exception.status()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exception.error().code()).isEqualTo("INSUFFICIENT_QUESTIONS");
        assertThat(exception.error().message())
            .isEqualTo("Không đủ 50 câu hỏi để bắt đầu bài kiểm tra. Vui lòng chọn khóa học khác.");
        assertThat(exception.error().availableCount()).isEqualTo(availableCount);
        verifyQuestionLookup();
        verifyNoInteractions(sessions, rewards);
    }

    private void assertCreatedQuiz(StartResponse response, List<Candidate> pool) {
        assertThat(response.sessionId()).isNotNull();
        assertThat(Duration.between(response.serverTime(), response.expiresAt())).isEqualTo(Duration.ofMinutes(60));
        assertThat(response.questions()).extracting(QuizQuestion::id)
            .hasSize(QUESTION_COUNT)
            .doesNotHaveDuplicates()
            .isSubsetOf(pool.stream().map(Candidate::id).toList());
        verifyQuestionLookup();
        verify(sessions).create(eq(STUDENT_ID), eq(COURSE_ID), eq(response.expiresAt()), snapshots.capture());
        assertThat(snapshots.getValue()).extracting(QuestionSnapshot::question)
            .containsExactlyElementsOf(response.questions());
        assertThat(snapshots.getValue()).allSatisfy(snapshot -> {
            assertThat(snapshot.correctOptionId()).isEqualTo(2);
            assertThat(snapshot.question().options()).anySatisfy(option -> {
                assertThat(option.id()).isEqualTo(snapshot.correctOptionId());
                assertThat(option.text()).isEqualTo("Correct");
            });
        });
        verifyNoInteractions(rewards);
    }

    private void verifyQuestionLookup() {
        verify(courses).findByIdAndStatus(COURSE_ID, Course.Status.PUBLISHED);
        verify(questions).findEligibleQuestionsByCourseId(COURSE_ID);
        verifyNoMoreInteractions(courses, questions);
    }

    private static List<Candidate> candidates(int count) {
        return IntStream.rangeClosed(1, count)
            .mapToObj(id -> new Candidate(id, "Question " + id, null, ANSWER_DATA, "Explanation " + id))
            .toList();
    }
}
