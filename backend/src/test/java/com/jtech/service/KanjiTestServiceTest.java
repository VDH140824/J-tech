package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.KanjiExerciseRequest;
import com.jtech.dto.request.KanjiTestRequest;
import com.jtech.entity.Question.*;
import com.jtech.entity.User;
import java.security.Principal;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class KanjiTestServiceTest {

  @Mock
  JdbcTemplate db;

  @Mock
  FeedbackService access;

  @Mock
  KanjiExerciseService exercise;

  final ObjectMapper mapper = new ObjectMapper();
  final Principal principal = () -> "student@example.com";
  KanjiTestService service;

  @BeforeEach
  void setup() {
    service = new KanjiTestService(db, access, mapper, exercise);
  }

  private KanjiExerciseRequest question(QuestionType type) {
    var matches = new LinkedHashMap<String, String>();
    matches.put("日", "ngày");
    matches.put("月", "tháng");
    return new KanjiExerciseRequest(
      type,
      "日 là gì?",
      "日 nghĩa là ngày.",
      Difficulty.EASY,
      0,
      type == QuestionType.MCQ ? List.of("ngày", "tháng") : List.of(),
      type == QuestionType.MATCHING ? "" : "ngày",
      type == QuestionType.MATCHING ? matches : Map.of()
    );
  }

  private KanjiTestService.Snapshot snapshot(Map<String, String> answers) {
    return new KanjiTestService.Snapshot(
      "Original title",
      70,
      List.of(
        question(QuestionType.MCQ),
        question(QuestionType.FILL_IN),
        question(QuestionType.MATCHING)
      ),
      answers
    );
  }

  private void student() {
    User user = new User();
    user.setUserId(42L);
    when(access.actor(principal, "STUDENT")).thenReturn(user);
  }

  private void owned(
    String status,
    LocalDateTime deadline,
    Map<String, String> answers
  ) throws Exception {
    ResultSet rs = mock(ResultSet.class);
    when(rs.getLong("id")).thenReturn(100L);
    when(rs.getLong("chapter_id")).thenReturn(10L);
    when(rs.getString("status")).thenReturn(status);
    when(rs.getTimestamp("deadline_at")).thenReturn(
      Timestamp.valueOf(deadline)
    );
    when(rs.getTimestamp("submitted_at")).thenReturn(
      status.equals("IN_PROGRESS")
        ? null
        : Timestamp.valueOf(LocalDateTime.of(2026, 1, 1, 1, 0))
    );
    when(rs.getString("answers_data")).thenReturn(
      mapper.writeValueAsString(snapshot(answers))
    );
    when(
      db.query(
        contains("WHERE a.id=? AND a.user_id=?"),
        any(RowMapper.class),
        eq(100L),
        eq(42L)
      )
    ).thenAnswer(invocation -> {
      RowMapper<?> row = invocation.getArgument(1);
      return List.of(row.mapRow(rs, 0));
    });
  }

  @Test
  void inProgressResponseNeverExposesSolutionsOrScore() {
    var result = KanjiTestService.publicAttempt(
      1,
      10,
      "IN_PROGRESS",
      "deadline",
      null,
      "now",
      snapshot(Map.of("0", "ngày"))
    );
    assertNull(result.score());
    assertFalse(result.passed());
    assertEquals(0, result.correctCount());
    assertTrue(
      result
        .questions()
        .stream()
        .allMatch(
          q ->
            q.answer() == null && q.explanation() == null && q.correct() == null
        )
    );
    assertEquals(List.of("ngày", "tháng"), result.questions().get(0).options());
    assertEquals(2, result.questions().get(2).left().size());
  }

  @Test
  void submittedResponseContainsPerQuestionFeedbackAndRoundedScore() {
    var result = KanjiTestService.publicAttempt(
      1,
      10,
      "SUBMITTED",
      "deadline",
      "submitted",
      "now",
      snapshot(Map.of("0", "ngày", "1", "tháng", "2:0", "ngày", "2:1", "tháng"))
    );
    assertEquals(66.67, result.score());
    assertFalse(result.passed());
    assertEquals(2, result.correctCount());
    assertTrue(result.questions().get(0).correct());
    assertFalse(result.questions().get(1).correct());
    assertTrue(result.questions().get(2).correct());
    assertEquals("ngày", result.questions().get(0).answer());
    assertEquals("日 nghĩa là ngày.", result.questions().get(0).explanation());
  }

  @Test
  void matchingRequiresEveryPairAndBlankAnswersAreWrong() {
    assertFalse(
      KanjiTestService.correct(
        question(QuestionType.MATCHING),
        0,
        Map.of("0:0", "ngày")
      )
    );
    assertFalse(
      KanjiTestService.correct(question(QuestionType.MCQ), 0, Map.of())
    );
    assertTrue(
      KanjiTestService.correct(
        question(QuestionType.FILL_IN),
        0,
        Map.of("0", "  NGÀY  ")
      )
    );
  }

  @Test
  void snapshotsRemainIndependentOfLaterTestEdits() throws Exception {
    String stored = mapper.writeValueAsString(snapshot(Map.of("0", "ngày")));
    var restored = mapper.readValue(stored, KanjiTestService.Snapshot.class);
    var result = KanjiTestService.publicAttempt(
      1,
      10,
      "SUBMITTED",
      "deadline",
      "submitted",
      "now",
      restored
    );
    assertEquals("Original title", result.title());
    assertEquals("日 nghĩa là ngày.", result.questions().get(0).explanation());
    assertEquals("ngày", result.questions().get(0).answer());
  }

  @Test
  void refusesAttemptOwnedByAnotherStudent() {
    student();
    when(
      db.query(anyString(), any(RowMapper.class), eq(100L), eq(42L))
    ).thenReturn(List.of());
    assertThrows(ResponseStatusException.class, () ->
      service.attempt(100, principal)
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void submittedAttemptIsIdempotentAndCannotBeChanged() throws Exception {
    student();
    owned("SUBMITTED", LocalDateTime.of(2026, 1, 1, 0, 0), Map.of("0", "ngày"));
    var result = service.answer(100, Map.of("0", "tháng"), true, principal);
    assertEquals("ngày", result.answers().get("0"));
    assertEquals("SUBMITTED", result.status());
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void deadlineGradesSavedAnswersAndRefusesLateChanges() throws Exception {
    student();
    owned(
      "IN_PROGRESS",
      LocalDateTime.of(2020, 1, 1, 0, 0),
      Map.of("0", "tháng")
    );
    var result = service.answer(100, Map.of("0", "ngày"), true, principal);
    assertEquals("AUTO_SUBMITTED", result.status());
    assertEquals("tháng", result.answers().get("0"));
    assertEquals(0.0, result.score());
    verify(db, never()).update(
      startsWith("UPDATE test_attempt SET answers_data"),
      any(),
      any(),
      any()
    );
  }

  @Test
  void rejectsAnswersOutsideSnapshot() throws Exception {
    student();
    owned("IN_PROGRESS", LocalDateTime.of(2100, 1, 1, 0, 0), Map.of());
    assertThrows(IllegalArgumentException.class, () ->
      service.answer(100, Map.of("999", "ngày"), false, principal)
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void validSubmissionPersistsScoreAndAnswers() throws Exception {
    student();
    owned("IN_PROGRESS", LocalDateTime.of(2100, 1, 1, 0, 0), Map.of());
    var result = service.answer(
      100,
      Map.of("0", "ngày", "1", "ngày", "2:0", "ngày", "2:1", "tháng"),
      true,
      principal
    );
    assertEquals(100.0, result.score());
    assertTrue(result.passed());
    assertEquals("SUBMITTED", result.status());
    verify(db).update(
      startsWith("UPDATE test_attempt SET answers_data"),
      anyString(),
      any(LocalDateTime.class),
      eq(100L)
    );
  }

  @Test
  void historyIsLimitedToCurrentStudentAndChapterAndExcludesLegacyTests() {
    student();
    when(
      db.queryForList(anyString(), eq(Long.class), eq(42L), eq(10L))
    ).thenReturn(List.of());
    assertNull(service.latest(10, principal));
    verify(db).queryForList(
      argThat(
        sql ->
          sql.contains("a.user_id=?") &&
          sql.contains("t.chapter_id=?") &&
          sql.contains("t.test_type='CHAPTER_TEST'") &&
          sql.contains("t.lesson_id IS NULL") &&
          sql.contains("SUBMITTED") &&
          sql.contains("ORDER BY a.submitted_at DESC,a.id DESC LIMIT 1")
      ),
      eq(Long.class),
      eq(42L),
      eq(10L)
    );
  }

  @Test
  void unauthorisedStudentCannotReadHistory() {
    when(access.actor(principal, "STUDENT")).thenThrow(
      new AccessDeniedException("Denied")
    );
    assertThrows(AccessDeniedException.class, () ->
      service.latest(10, principal)
    );
    verifyNoInteractions(db);
  }

  @Test
  void startCreatesPrivateSnapshotAndReturnsOnlyPublicQuestions()
    throws Exception {
    student();
    when(
      db.queryForObject(
        startsWith("SELECT id FROM user_account"),
        eq(Long.class),
        eq(42L)
      )
    ).thenReturn(42L);
    ResultSet lesson = mock(ResultSet.class);
    when(lesson.getString("status")).thenReturn("PUBLISHED");
    when(lesson.getString("chapter_status")).thenReturn("PUBLISHED");
    when(lesson.getString("course_status")).thenReturn("PUBLISHED");
    when(lesson.getLong("chapter_id")).thenReturn(10L);
    when(
      db.query(contains("WHERE ch.id=?"), any(RowMapper.class), eq(10L))
    ).thenAnswer(invocation -> {
      RowMapper<?> row = invocation.getArgument(1);
      return List.of(row.mapRow(lesson, 0));
    });
    ResultSet test = mock(ResultSet.class);
    when(test.getLong("id")).thenReturn(7L);
    when(test.getString("title")).thenReturn("Original title");
    when(test.getString("description")).thenReturn("");
    when(test.getInt("duration_minutes")).thenReturn(15);
    when(test.getInt("passing_score")).thenReturn(70);
    when(test.getString("status")).thenReturn("PUBLISHED");
    when(
      db.query(contains("WHERE t.chapter_id=?"), any(RowMapper.class), eq(10L))
    ).thenAnswer(invocation -> {
      RowMapper<?> row = invocation.getArgument(1);
      return List.of(row.mapRow(test, 0));
    });
    when(
      db.queryForList(
        contains("status='IN_PROGRESS'"),
        eq(Long.class),
        eq(7L),
        eq(42L)
      )
    ).thenReturn(List.of());
    when(
      db.queryForObject(
        contains("MAX(attempt_no)"),
        eq(Integer.class),
        eq(7L),
        eq(42L)
      )
    ).thenReturn(1);
    when(
      db.query(contains("WHERE tq.test_id=?"), any(RowMapper.class), eq(7L))
    ).thenReturn(snapshot(Map.of()).questions());
    var connection = mock(java.sql.Connection.class);
    var statement = mock(java.sql.PreparedStatement.class);
    when(
      connection.prepareStatement(
        contains("INSERT INTO test_attempt"),
        eq(java.sql.Statement.RETURN_GENERATED_KEYS)
      )
    ).thenReturn(statement);
    when(
      db.update(
        any(org.springframework.jdbc.core.PreparedStatementCreator.class),
        any(org.springframework.jdbc.support.KeyHolder.class)
      )
    ).thenAnswer(invocation -> {
      org.springframework.jdbc.core.PreparedStatementCreator creator =
        invocation.getArgument(0);
      creator.createPreparedStatement(connection);
      org.springframework.jdbc.support.KeyHolder key = invocation.getArgument(
        1
      );
      key.getKeyList().add(Map.of("id", 100L));
      return 1;
    });
    owned("IN_PROGRESS", LocalDateTime.of(2100, 1, 1, 0, 0), Map.of());
    var result = service.start(10, 7, principal);
    var stored = org.mockito.ArgumentCaptor.forClass(Object.class);
    verify(statement).setObject(eq(5), stored.capture());
    var snap = mapper.readValue(
      (String) stored.getValue(),
      KanjiTestService.Snapshot.class
    );
    assertEquals("ngày", snap.questions().getFirst().correctAnswer());
    assertFalse(snap.questions().getFirst().explanation().isBlank());
    assertTrue(
      result
        .questions()
        .stream()
        .allMatch(q -> q.answer() == null && q.explanation() == null)
    );
    assertEquals(100, result.id());
  }

  @Test
  void requiresExplanationForEveryModeratorQuestion() throws Exception {
    User user = new User();
    user.setUserId(8L);
    when(access.actor(principal, "MODERATOR")).thenReturn(user);
    ResultSet rs = mock(ResultSet.class);
    when(rs.getString("status")).thenReturn("DRAFT");
    when(rs.getLong("chapter_id")).thenReturn(2L);
    when(
      db.query(contains("WHERE ch.id=?"), any(RowMapper.class), eq(10L))
    ).thenAnswer(invocation -> {
      RowMapper<?> row = invocation.getArgument(1);
      return List.of(row.mapRow(rs, 0));
    });
    var q = question(QuestionType.MCQ);
    var invalid = new KanjiExerciseRequest(
      q.questionType(),
      q.content(),
      "",
      q.difficulty(),
      0,
      q.options(),
      q.correctAnswer(),
      q.matches()
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.save(
        10,
        new KanjiTestRequest(
          "Test",
          "",
          10,
          70,
          KanjiTestRequest.Status.DRAFT,
          List.of(invalid)
        ),
        principal
      )
    );
    verifyNoInteractions(exercise);
  }

  private void moderatorChapter() throws Exception {
    User user = new User();
    user.setUserId(8L);
    when(access.actor(principal, "MODERATOR")).thenReturn(user);
    ResultSet rs = mock(ResultSet.class);
    when(rs.getString("status")).thenReturn("PUBLISHED");
    when(rs.getString("chapter_status")).thenReturn("PUBLISHED");
    when(rs.getString("course_status")).thenReturn("PUBLISHED");
    when(rs.getLong("chapter_id")).thenReturn(10L);
    when(
      db.query(contains("WHERE ch.id=?"), any(RowMapper.class), eq(10L))
    ).thenAnswer(invocation -> {
      RowMapper<?> row = invocation.getArgument(1);
      return List.of(row.mapRow(rs, 0));
    });
    var q = question(QuestionType.MCQ);
    when(exercise.validateAnswer(q)).thenReturn(
      new KanjiExerciseService.AnswerData(
        q.options(),
        q.correctAnswer(),
        q.matches()
      )
    );
  }

  @Test
  void chapterTestCannotSelectQuestionsFromAnotherChapter() throws Exception {
    moderatorChapter();
    when(
      db.query(contains("WHERE l.chapter_id=?"), any(RowMapper.class), eq(10L))
    ).thenReturn(List.of());
    assertThrows(IllegalArgumentException.class, () ->
      service.save(
        10,
        new KanjiTestRequest(
          "Test",
          "",
          15,
          70,
          KanjiTestRequest.Status.PUBLISHED,
          List.of(question(QuestionType.MCQ))
        ),
        principal
      )
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void chapterTestCannotPublishQuestionsFromDraftLessons() throws Exception {
    moderatorChapter();
    var bank = new com.jtech.dto.response.KanjiTestResponse.BankQuestion(
      2,
      3,
      1,
      "Lesson",
      false,
      question(QuestionType.MCQ)
    );
    when(
      db.query(contains("WHERE l.chapter_id=?"), any(RowMapper.class), eq(10L))
    ).thenReturn(List.of(bank));
    assertThrows(IllegalArgumentException.class, () ->
      service.save(
        10,
        new KanjiTestRequest(
          "Test",
          "",
          15,
          70,
          KanjiTestRequest.Status.PUBLISHED,
          List.of(question(QuestionType.MCQ))
        ),
        principal
      )
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }

  @Test
  void chapterTestCannotSelectSameBankQuestionTwice() throws Exception {
    moderatorChapter();
    var q = question(QuestionType.MCQ);
    var bank = new com.jtech.dto.response.KanjiTestResponse.BankQuestion(
      2,
      3,
      1,
      "Lesson",
      true,
      q
    );
    when(
      db.query(contains("WHERE l.chapter_id=?"), any(RowMapper.class), eq(10L))
    ).thenReturn(List.of(bank));
    assertThrows(IllegalArgumentException.class, () ->
      service.save(
        10,
        new KanjiTestRequest(
          "Test",
          "",
          15,
          70,
          KanjiTestRequest.Status.PUBLISHED,
          List.of(q, q)
        ),
        principal
      )
    );
    verify(db, never()).update(anyString(), any(Object[].class));
  }
}
