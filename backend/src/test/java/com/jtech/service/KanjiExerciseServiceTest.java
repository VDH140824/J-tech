package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.controller.KanjiExerciseController;
import com.jtech.dto.request.KanjiExerciseRequest;
import com.jtech.entity.*;
import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.TypedQuery;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.security.Principal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class KanjiExerciseServiceTest {

  @Mock
  EntityManager em;

  @Mock
  JdbcTemplate db;

  @Mock
  UserRepository users;

  private static ValidatorFactory factory;
  private KanjiExerciseService service;
  private final Principal principal = () -> "moderator@example.com";

  @BeforeAll
  static void validator() {
    factory = Validation.buildDefaultValidatorFactory();
  }

  @AfterAll
  static void closeValidator() {
    factory.close();
  }

  @BeforeEach
  void setup() {
    service = new KanjiExerciseService(
      em,
      db,
      users,
      new ObjectMapper(),
      factory.getValidator()
    );
  }

  private KanjiExerciseRequest request(
    Question.QuestionType type,
    List<String> options,
    String answer,
    Map<String, String> matches
  ) {
    return new KanjiExerciseRequest(
      type,
      "Chọn nghĩa của 日",
      "Giải thích",
      Question.Difficulty.EASY,
      1,
      options,
      answer,
      matches
    );
  }

  private KanjiExerciseRequest valid() {
    return request(
      Question.QuestionType.MCQ,
      List.of("Ngày", "Nước"),
      "Ngày",
      Map.of()
    );
  }

  private void actor(String role, UserStatus status) {
    User user = new User();
    user.setUserId(7L);
    user.setStatus(status);
    Role r = new Role();
    r.setRoleName(role);
    user.setRole(r);
    when(users.findByEmail(principal.getName())).thenReturn(Optional.of(user));
  }

  private void lesson(boolean write) {
    Lesson l = new Lesson();
    l.setId(10L);
    l.setSkillType(Lesson.SkillType.KANJI);
    if (write) when(
      em.find(Lesson.class, 10L, LockModeType.PESSIMISTIC_WRITE)
    ).thenReturn(l);
    else when(em.find(Lesson.class, 10L)).thenReturn(l);
  }

  private Question question() {
    Question q = new Question();
    q.setId(20L);
    q.setLessonId(10L);
    q.setSkill(Question.Skill.KANJI);
    q.setIsExerciseQuestion(true);
    q.setStatus(Question.QuestionStatus.ACTIVE);
    return q;
  }

  private void used(boolean used) {
    when(
      db.queryForObject(
        anyString(),
        eq(Boolean.class),
        eq(20L),
        eq(20L),
        eq(10L)
      )
    ).thenReturn(used);
  }

  @Test
  void normalizesMcqAndKeepsCanonicalAnswer() {
    var answer = service.validateAnswer(
      request(Question.QuestionType.MCQ, List.of(" 日 ", "水"), "日", Map.of())
    );
    assertEquals(List.of("日", "水"), answer.options());
    assertEquals("日", answer.correctAnswer());
  }

  @Test
  void rejectsDuplicateOptionsAndMissingCorrectAnswer() {
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        request(
          Question.QuestionType.MCQ,
          List.of("日", " 日 "),
          "日",
          Map.of()
        )
      )
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        request(Question.QuestionType.MCQ, List.of("日", "水"), "火", Map.of())
      )
    );
  }

  @Test
  void validatesFillIn() {
    assertEquals(
      "ひ",
      service
        .validateAnswer(
          request(Question.QuestionType.FILL_IN, List.of(), " ひ ", Map.of())
        )
        .correctAnswer()
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        request(Question.QuestionType.FILL_IN, List.of(), " ", Map.of())
      )
    );
  }

  @Test
  void validatesMatchingAndRejectsDuplicateNormalizedSides() {
    assertEquals(
      Map.of("日", "Ngày", "水", "Nước"),
      service
        .validateAnswer(
          request(
            Question.QuestionType.MATCHING,
            List.of(),
            "",
            Map.of(" 日 ", "Ngày", "水", " Nước ")
          )
        )
        .matches()
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        request(
          Question.QuestionType.MATCHING,
          List.of(),
          "",
          Map.of("日", "Ngày", "水", " ngày ")
        )
      )
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        request(
          Question.QuestionType.MATCHING,
          List.of(),
          "",
          Map.of("日", "Ngày")
        )
      )
    );
  }

  @Test
  void validatesTextAndDisplayOrderLimits() {
    assertDoesNotThrow(() ->
      service.validateAnswer(
        new KanjiExerciseRequest(
          Question.QuestionType.FILL_IN,
          "a".repeat(10000),
          "",
          Question.Difficulty.HARD,
          65535,
          List.of(),
          "a".repeat(1000),
          Map.of()
        )
      )
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        new KanjiExerciseRequest(
          Question.QuestionType.FILL_IN,
          "a".repeat(10001),
          "",
          Question.Difficulty.HARD,
          65536,
          List.of(),
          "a",
          Map.of()
        )
      )
    );
    assertThrows(IllegalArgumentException.class, () ->
      service.validateAnswer(
        request(
          Question.QuestionType.MCQ,
          Arrays.asList(null, "日"),
          "日",
          Map.of()
        )
      )
    );
  }

  @Test
  void rejectsAnonymous() {
    assertThrows(AccessDeniedException.class, () ->
      service.detail(null, 10, 20)
    );
    verifyNoInteractions(em);
  }

  @ParameterizedTest
  @ValueSource(strings = { "STUDENT", "ADMIN" })
  void rejectsOtherRoles(String role) {
    actor(role, UserStatus.ACTIVE);
    assertThrows(AccessDeniedException.class, () ->
      service.save(principal, 10, null, valid())
    );
    verifyNoInteractions(em);
  }

  @ParameterizedTest
  @ValueSource(strings = { "PENDING", "LOCKED", "REJECTED" })
  void rejectsInactiveModerator(String status) {
    actor("MODERATOR", UserStatus.valueOf(status));
    assertThrows(AccessDeniedException.class, () ->
      service.delete(principal, 10, 20)
    );
    verifyNoInteractions(em);
  }

  @Test
  void rejectsNonKanjiLesson() {
    actor("MODERATOR", UserStatus.ACTIVE);
    Lesson l = new Lesson();
    l.setSkillType(Lesson.SkillType.VOCABULARY);
    when(em.find(Lesson.class, 10L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(
      l
    );
    assertEquals(
      400,
      assertThrows(ResponseStatusException.class, () ->
        service.save(principal, 10, null, valid())
      )
        .getStatusCode()
        .value()
    );
    verify(em, never()).persist(any());
  }

  @Test
  void rejectsArchivedLessonWrites() {
    actor("MODERATOR", UserStatus.ACTIVE);
    Lesson l = new Lesson();
    l.setSkillType(Lesson.SkillType.KANJI);
    l.setStatus(Course.Status.ARCHIVED);
    when(em.find(Lesson.class, 10L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(
      l
    );
    assertEquals(
      409,
      assertThrows(ResponseStatusException.class, () ->
        service.save(principal, 10, null, valid())
      )
        .getStatusCode()
        .value()
    );
  }

  @Test
  void rejectsQuestionFromDifferentLessonOrSkill() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(false);
    Question q = question();
    q.setLessonId(11L);
    when(em.find(Question.class, 20L)).thenReturn(q);
    assertEquals(
      404,
      assertThrows(ResponseStatusException.class, () ->
        service.detail(principal, 10, 20)
      )
        .getStatusCode()
        .value()
    );
    q.setLessonId(10L);
    q.setSkill(Question.Skill.GRAMMAR);
    assertThrows(ResponseStatusException.class, () ->
      service.detail(principal, 10, 20)
    );
  }

  @Test
  void createsKanjiExerciseWithAuditFields() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    doAnswer(call -> {
      ((Question) call.getArgument(0)).setId(30L);
      return null;
    })
      .when(em)
      .persist(any(Question.class));
    var result = service.save(principal, 10, null, valid());
    assertEquals(30L, result.id());
    assertEquals("Ngày", result.correctAnswer());
    verify(em).persist(
      argThat(
        q ->
          q instanceof Question item &&
          item.getSkill() == Question.Skill.KANJI &&
          item.getCreatedBy() == 7L &&
          item.getCreatedAt() != null
      )
    );
  }

  @Test
  void updatesUnusedQuestionInPlace() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    Question q = question();
    when(
      em.find(Question.class, 20L, LockModeType.PESSIMISTIC_WRITE)
    ).thenReturn(q);
    used(false);
    assertEquals(20L, service.save(principal, 10, 20L, valid()).id());
    assertEquals(7L, q.getUpdatedBy());
    verify(em, never()).persist(any());
  }

  @Test
  void versionsUsedQuestionWithoutOverwritingOldAnswer() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    Question q = question();
    q.setContent("Nội dung cũ");
    q.setAnswerData("old answer");
    when(
      em.find(Question.class, 20L, LockModeType.PESSIMISTIC_WRITE)
    ).thenReturn(q);
    used(true);
    doAnswer(call -> {
      ((Question) call.getArgument(0)).setId(30L);
      return null;
    })
      .when(em)
      .persist(any(Question.class));
    assertEquals(30L, service.save(principal, 10, 20L, valid()).id());
    assertEquals(Question.QuestionStatus.ARCHIVED, q.getStatus());
    assertEquals("old answer", q.getAnswerData());
    assertEquals("Nội dung cũ", q.getContent());
  }

  @Test
  void rejectsEditingArchivedQuestion() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    Question q = question();
    q.setStatus(Question.QuestionStatus.ARCHIVED);
    when(
      em.find(Question.class, 20L, LockModeType.PESSIMISTIC_WRITE)
    ).thenReturn(q);
    assertEquals(
      409,
      assertThrows(ResponseStatusException.class, () ->
        service.save(principal, 10, 20L, valid())
      )
        .getStatusCode()
        .value()
    );
  }

  @Test
  void deletesUnusedQuestion() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    Question q = question();
    when(
      em.find(Question.class, 20L, LockModeType.PESSIMISTIC_WRITE)
    ).thenReturn(q);
    used(false);
    assertEquals("DELETED", service.delete(principal, 10, 20));
    verify(em).remove(q);
  }

  @Test
  void archivesUsedQuestion() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    Question q = question();
    when(
      em.find(Question.class, 20L, LockModeType.PESSIMISTIC_WRITE)
    ).thenReturn(q);
    used(true);
    assertEquals("ARCHIVED", service.delete(principal, 10, 20));
    assertEquals(Question.QuestionStatus.ARCHIVED, q.getStatus());
    verify(em, never()).remove(any());
  }

  @Test
  void validatesPaginationBeforeQuerying() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(false);
    assertThrows(ResponseStatusException.class, () ->
      service.list(principal, 10, null, -1, 10)
    );
    assertThrows(ResponseStatusException.class, () ->
      service.list(principal, 10, null, 0, 101)
    );
  }

  @Test
  @SuppressWarnings("unchecked")
  void paginatesAndCountsWithSameScope() {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(false);
    TypedQuery<Question> rows = mock(TypedQuery.class);
    TypedQuery<Long> count = mock(TypedQuery.class);
    when(em.createQuery(startsWith("SELECT q"), eq(Question.class))).thenReturn(
      rows
    );
    when(
      em.createQuery(startsWith("SELECT COUNT(q)"), eq(Long.class))
    ).thenReturn(count);
    when(rows.setFirstResult(100)).thenReturn(rows);
    when(rows.setMaxResults(10)).thenReturn(rows);
    when(rows.getResultList()).thenReturn(List.of());
    when(count.getSingleResult()).thenReturn(125L);
    var result = service.list(
      principal,
      10,
      Question.QuestionStatus.ACTIVE,
      10,
      10
    );
    assertEquals(125, result.getTotalElements());
    assertEquals(13, result.getTotalPages());
    verify(rows).setParameter("status", Question.QuestionStatus.ACTIVE);
    verify(count).setParameter("status", Question.QuestionStatus.ACTIVE);
    verify(rows).setParameter("skill", Question.Skill.KANJI);
    verify(count).setParameter("lesson", 10L);
  }

  @Test
  void rejectsInvalidHttpFieldsAndPaginationTypes() throws Exception {
    var mvc = MockMvcBuilders.standaloneSetup(
      new KanjiExerciseController(service)
    )
      .setControllerAdvice(new GlobalExceptionHandler())
      .build();
    mvc
      .perform(
        get("/moderator/kanji/lessons/10/exercises").param("page", "invalid")
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(
        get("/moderator/kanji/lessons/10/exercises").param(
          "status",
          "PUBLISHED"
        )
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(
        post("/moderator/kanji/lessons/10/exercises")
          .contentType("application/json")
          .content("{\"questionType\":\"INVALID\"}")
      )
      .andExpect(status().isBadRequest());
    mvc
      .perform(
        post("/moderator/kanji/lessons/10/exercises")
          .contentType("application/json")
          .content("{\"questionType\":\"MCQ\",\"content\":\"\"}")
      )
      .andExpect(status().isBadRequest());
    verifyNoInteractions(users, em, db);
  }

  @Test
  void createsFillInThroughHttpWithTypedAnswerPayload() throws Exception {
    actor("MODERATOR", UserStatus.ACTIVE);
    lesson(true);
    doAnswer(call -> {
      ((Question) call.getArgument(0)).setId(30L);
      return null;
    })
      .when(em)
      .persist(any(Question.class));
    var mvc = MockMvcBuilders.standaloneSetup(
      new KanjiExerciseController(service)
    )
      .setControllerAdvice(new GlobalExceptionHandler())
      .build();
    mvc
      .perform(
        post("/moderator/kanji/lessons/10/exercises")
          .principal(principal)
          .contentType("application/json")
          .content(
            new ObjectMapper().writeValueAsString(
              request(Question.QuestionType.FILL_IN, List.of(), "ひ", Map.of())
            )
          )
      )
      .andExpect(status().isCreated())
      .andExpect(jsonPath("id").value(30))
      .andExpect(jsonPath("correctAnswer").value("ひ"));
  }
}
