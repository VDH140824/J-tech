package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.KanjiExerciseRequest;
import com.jtech.dto.request.KanjiTestRequest;
import com.jtech.dto.response.KanjiTestResponse;
import com.jtech.dto.response.KanjiTestResponse.*;
import java.security.Principal;
import java.sql.Statement;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KanjiTestService {

  private final JdbcTemplate db;
  private final FeedbackService access;
  private final ObjectMapper mapper;
  private final KanjiExerciseService exercise;

  public KanjiTestService(
    JdbcTemplate db,
    FeedbackService access,
    ObjectMapper mapper,
    KanjiExerciseService exercise
  ) {
    this.db = db;
    this.access = access;
    this.mapper = mapper;
    this.exercise = exercise;
  }

  public record Snapshot(
    String title,
    int passingScore,
    List<KanjiExerciseRequest> questions,
    Map<String, String> answers
  ) {}

  private record TestRow(
    long id,
    String title,
    String description,
    int duration,
    int passing,
    String status
  ) {}

  private record AttemptRow(
    long id,
    long chapterId,
    String status,
    LocalDateTime deadline,
    LocalDateTime submitted,
    String data
  ) {}

  private ResponseStatusException missing() {
    return new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Không tìm thấy Test hoặc bài làm khả dụng."
    );
  }

  private String json(Object data) {
    try {
      return mapper.writeValueAsString(data);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Không thể lưu nội dung Test.", e);
    }
  }

  private <T> T read(String data, Class<T> type) {
    try {
      return mapper.readValue(data, type);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Dữ liệu Test không hợp lệ.", e);
    }
  }

  private long insert(String sql, Object... values) {
    var key = new GeneratedKeyHolder();
    db.update(connection -> {
      var ps = connection.prepareStatement(
        sql,
        Statement.RETURN_GENERATED_KEYS
      );
      for (int i = 0; i < values.length; i++) ps.setObject(i + 1, values[i]);
      return ps;
    }, key);
    return Objects.requireNonNull(key.getKey()).longValue();
  }

  private long chapter(long id, boolean moderator, boolean lock) {
    var rows = db.query(
      """
      SELECT ch.id AS chapter_id, ch.status, ch.status AS chapter_status, c.status AS course_status, c.deleted_at
      FROM chapter ch JOIN course c ON c.id=ch.course_id
      WHERE ch.id=?
      """ + (lock ? " FOR UPDATE" : ""),
      (rs, n) -> {
        boolean available =
          "PUBLISHED".equals(rs.getString("status")) &&
          "PUBLISHED".equals(rs.getString("chapter_status")) &&
          "PUBLISHED".equals(rs.getString("course_status")) &&
          rs.getObject("deleted_at") == null;
        if (
          (!moderator && !available) ||
          (lock && "ARCHIVED".equals(rs.getString("status")))
        ) throw missing();
        return rs.getLong("chapter_id");
      },
      id
    );
    if (rows.isEmpty()) throw missing();
    return rows.getFirst();
  }

  private List<TestRow> testRows(long chapterId, boolean lock) {
    return db.query(
      """
      SELECT t.* FROM test t
      WHERE t.chapter_id=? AND t.skill='KANJI' AND t.test_type='CHAPTER_TEST' AND t.lesson_id IS NULL
      ORDER BY t.id DESC
      """ + (lock ? " FOR UPDATE" : ""),
      (rs, n) ->
        new TestRow(
          rs.getLong("id"),
          rs.getString("title"),
          rs.getString("description"),
          rs.getInt("duration_minutes"),
          rs.getInt("passing_score"),
          rs.getString("status")
        ),
      chapterId
    );
  }

  private List<KanjiExerciseRequest> questions(long testId) {
    return db.query(
      """
      SELECT q.* FROM test_question tq JOIN question q ON q.id=tq.question_id
      WHERE tq.test_id=? AND tq.part_type='KANJI' AND q.skill='KANJI'
      ORDER BY q.display_order,q.id
      """,
      (rs, n) -> {
        var a = read(
          rs.getString("answer_data"),
          KanjiExerciseService.AnswerData.class
        );
        return new KanjiExerciseRequest(
          com.jtech.entity.Question.QuestionType.valueOf(
            rs.getString("question_type")
          ),
          rs.getString("content"),
          rs.getString("explanation"),
          com.jtech.entity.Question.Difficulty.valueOf(
            rs.getString("difficulty")
          ),
          rs.getInt("display_order"),
          a.options(),
          a.correctAnswer(),
          a.matches()
        );
      },
      testId
    );
  }

  private static boolean sameQuestion(
    KanjiExerciseRequest a,
    KanjiExerciseRequest b
  ) {
    return (
      a.questionType() == b.questionType() &&
      Objects.equals(a.content(), b.content()) &&
      Objects.equals(a.explanation(), b.explanation()) &&
      a.difficulty() == b.difficulty() &&
      Objects.equals(a.options(), b.options()) &&
      Objects.equals(a.correctAnswer(), b.correctAnswer()) &&
      Objects.equals(a.matches(), b.matches())
    );
  }

  private List<BankQuestion> bank(long chapterId) {
    return db.query(
      """
      SELECT q.*,l.lesson_no,l.title AS lesson_title,l.status AS lesson_status
      FROM question q JOIN lesson l ON l.id=q.lesson_id
      WHERE l.chapter_id=? AND l.skill_type='KANJI' AND l.status IN ('DRAFT','PUBLISHED')
        AND q.skill='KANJI' AND q.status='ACTIVE' AND q.is_exercise_question=TRUE
      ORDER BY l.display_order,l.lesson_no,q.display_order,q.id
      """,
      (rs, n) -> {
        var answer = read(
          rs.getString("answer_data"),
          KanjiExerciseService.AnswerData.class
        );
        var q = new KanjiExerciseRequest(
          com.jtech.entity.Question.QuestionType.valueOf(
            rs.getString("question_type")
          ),
          rs.getString("content"),
          rs.getString("explanation"),
          com.jtech.entity.Question.Difficulty.valueOf(
            rs.getString("difficulty")
          ),
          rs.getInt("display_order"),
          answer.options(),
          answer.correctAnswer(),
          answer.matches()
        );
        return new BankQuestion(
          rs.getLong("id"),
          rs.getLong("lesson_id"),
          rs.getInt("lesson_no"),
          rs.getString("lesson_title"),
          "PUBLISHED".equals(rs.getString("lesson_status")),
          q
        );
      },
      chapterId
    );
  }

  @Transactional(readOnly = true)
  public KanjiTestResponse setup(long chapterId, Principal p) {
    access.actor(p, "MODERATOR");
    chapter(chapterId, true, false);
    var rows = testRows(chapterId, false);
    if (rows.isEmpty()) return new KanjiTestResponse(
      null,
      null,
      bank(chapterId)
    );
    var t = rows.getFirst();
    return new KanjiTestResponse(
      t.id(),
      new KanjiTestRequest(
        t.title(),
        t.description(),
        t.duration(),
        t.passing(),
        KanjiTestRequest.Status.valueOf(t.status()),
        questions(t.id())
      ),
      bank(chapterId)
    );
  }

  @Transactional
  public KanjiTestResponse save(
    long chapterId,
    KanjiTestRequest request,
    Principal p
  ) {
    long actor = access.actor(p, "MODERATOR").getUserId();
    chapter(chapterId, true, true);
    if (request.status() == KanjiTestRequest.Status.PUBLISHED) chapter(
      chapterId,
      false,
      false
    );
    List<KanjiExerciseService.AnswerData> answers = new ArrayList<>();
    for (var q : request.questions()) {
      if (
        q.explanation() == null || q.explanation().isBlank()
      ) throw new IllegalArgumentException(
        "Mỗi câu hỏi cần có giải thích đáp án."
      );
      answers.add(exercise.validateAnswer(q));
    }
    var available = bank(chapterId);
    var selected = new ArrayList<BankQuestion>();
    for (var q : request.questions()) {
      var match = available
        .stream()
        .filter(item -> sameQuestion(item.question(), q))
        .findFirst()
        .orElseThrow(() ->
          new IllegalArgumentException(
            "Chỉ chọn câu hỏi Kanji đang hoạt động trong chương. Câu hỏi đã thay đổi cần được chọn lại."
          )
        );
      if (
        request.status() == KanjiTestRequest.Status.PUBLISHED &&
        !match.published()
      ) throw new IllegalArgumentException(
        "Hãy xuất bản bài chứa câu hỏi trước khi xuất bản Test chương."
      );
      if (
        selected.stream().anyMatch(item -> item.id() == match.id())
      ) throw new IllegalArgumentException("Không chọn trùng câu hỏi.");
      selected.add(match);
    }
    var rows = testRows(chapterId, true);
    if (rows.size() > 1) throw new IllegalStateException(
      "Chương đang có nhiều Test Kanji; cần xử lý dữ liệu trước khi sửa."
    );
    long id;
    if (rows.isEmpty()) id = insert(
      """
      INSERT INTO test(test_type,skill,lesson_id,chapter_id,title,description,duration_minutes,passing_score,status,created_by)
      VALUES ('CHAPTER_TEST','KANJI',NULL,?,?,?,?,?,?,?)
      """,
      chapterId,
      request.title().trim(),
      request.description(),
      request.durationMinutes(),
      request.passingScore(),
      request.status().name(),
      actor
    );
    else {
      id = rows.getFirst().id();
      db.update(
        """
        UPDATE test SET title=?,description=?,duration_minutes=?,passing_score=?,status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
        """,
        request.title().trim(),
        request.description(),
        request.durationMinutes(),
        request.passingScore(),
        request.status().name(),
        actor,
        id
      );
      db.update(
        """
        UPDATE question q JOIN test_question tq ON tq.question_id=q.id SET q.status='ARCHIVED'
        WHERE tq.test_id=? AND q.is_exercise_question=FALSE
        """,
        id
      );
      db.update("DELETE FROM test_question WHERE test_id=?", id);
    }
    for (int i = 0; i < request.questions().size(); i++) {
      var q = request.questions().get(i);
      long questionId = insert(
        """
        INSERT INTO question(skill,question_type,lesson_id,content,explanation,answer_data,difficulty,is_exercise_question,display_order,status,created_by)
        VALUES ('KANJI',?,?,?,?,?,?,FALSE,?,'ACTIVE',?)
        """,
        q.questionType().name(),
        selected.get(i).lessonId(),
        q.content().trim(),
        q.explanation().trim(),
        json(answers.get(i)),
        q.difficulty().name(),
        i,
        actor
      );
      db.update(
        "INSERT INTO test_question(test_id,question_id,part_type) VALUES (?,?,'KANJI')",
        id,
        questionId
      );
    }
    return setup(chapterId, p);
  }

  private LocalDateTime now() {
    return LocalDateTime.now(Clock.systemUTC());
  }

  private String instant(LocalDateTime value) {
    return value == null ? null : value.toInstant(ZoneOffset.UTC).toString();
  }

  private AttemptRow owned(long id, long userId) {
    var rows = db.query(
      """
      SELECT a.*,t.chapter_id FROM test_attempt a JOIN test t ON t.id=a.test_id
      WHERE a.id=? AND a.user_id=? AND t.skill='KANJI' FOR UPDATE
      """,
      (rs, n) ->
        new AttemptRow(
          rs.getLong("id"),
          rs.getLong("chapter_id"),
          rs.getString("status"),
          rs.getTimestamp("deadline_at").toLocalDateTime(),
          rs.getTimestamp("submitted_at") == null
            ? null
            : rs.getTimestamp("submitted_at").toLocalDateTime(),
          rs.getString("answers_data")
        ),
      id,
      userId
    );
    if (rows.isEmpty()) throw missing();
    return rows.getFirst();
  }

  @Transactional
  public Attempt start(long chapterId, long testId, Principal p) {
    long user = access.actor(p, "STUDENT").getUserId();
    db.queryForObject(
      "SELECT id FROM user_account WHERE id=? FOR UPDATE",
      Long.class,
      user
    );
    chapter(chapterId, false, false);
    var test = testRows(chapterId, true)
      .stream()
      .filter(t -> t.id() == testId && t.status().equals("PUBLISHED"))
      .findFirst()
      .orElseThrow(this::missing);
    var existing = db.queryForList(
      "SELECT id FROM test_attempt WHERE test_id=? AND user_id=? AND status='IN_PROGRESS' ORDER BY id DESC LIMIT 1",
      Long.class,
      testId,
      user
    );
    if (!existing.isEmpty()) return view(
      expire(owned(existing.getFirst(), user))
    );
    var items = questions(testId);
    if (items.isEmpty()) throw missing();
    var started = now();
    Integer number = db.queryForObject(
      "SELECT COALESCE(MAX(attempt_no),0)+1 FROM test_attempt WHERE test_id=? AND user_id=?",
      Integer.class,
      testId,
      user
    );
    long id = insert(
      """
      INSERT INTO test_attempt(test_id,user_id,attempt_no,total_questions,answers_data,started_at,deadline_at,status)
      VALUES (?,?,?,?,?,?,?,'IN_PROGRESS')
      """,
      testId,
      user,
      number,
      items.size(),
      json(new Snapshot(test.title(), test.passing(), items, Map.of())),
      started,
      started.plusMinutes(test.duration())
    );
    return view(owned(id, user));
  }

  static String normalize(String value) {
    return Normalizer.normalize(
      Objects.toString(value, "").trim(),
      Normalizer.Form.NFKC
    ).toLowerCase(Locale.ROOT);
  }

  static boolean correct(
    KanjiExerciseRequest q,
    int index,
    Map<String, String> answers
  ) {
    if (q.questionType() == com.jtech.entity.Question.QuestionType.MATCHING) {
      int pair = 0;
      for (String right : q.matches().values())
        if (
          !normalize(right).equals(normalize(answers.get(index + ":" + pair++)))
        ) return false;
      return true;
    }
    return normalize(q.correctAnswer()).equals(
      normalize(answers.get(String.valueOf(index)))
    );
  }

  private void validateAnswers(Snapshot snap, Map<String, String> answers) {
    Set<String> allowed = new HashSet<>();
    for (int i = 0; i < snap.questions().size(); i++) {
      var q = snap.questions().get(i);
      if (
        q.questionType() == com.jtech.entity.Question.QuestionType.MATCHING
      ) for (int j = 0; j < q.matches().size(); j++) allowed.add(i + ":" + j);
      else allowed.add(String.valueOf(i));
    }
    if (
      !allowed.containsAll(answers.keySet())
    ) throw new IllegalArgumentException("Đáp án không thuộc lượt làm này.");
  }

  private AttemptRow finish(AttemptRow row, String status) {
    var snap = read(row.data(), Snapshot.class);
    int count = 0;
    for (int i = 0; i < snap.questions().size(); i++) if (
      correct(snap.questions().get(i), i, snap.answers())
    ) count++;
    double score =
      Math.round((count * 10000.0) / snap.questions().size()) / 100.0;
    var submitted = now();
    db.update(
      """
      UPDATE test_attempt SET status=?,correct_count=?,score=?,is_passed=?,submitted_at=?,last_saved_at=?,
        time_spent_sec=GREATEST(0,TIMESTAMPDIFF(SECOND,started_at,LEAST(?,deadline_at))) WHERE id=? AND status='IN_PROGRESS'
      """,
      status,
      count,
      score,
      score >= snap.passingScore(),
      submitted,
      submitted,
      submitted,
      row.id()
    );
    return new AttemptRow(
      row.id(),
      row.chapterId(),
      status,
      row.deadline(),
      submitted,
      row.data()
    );
  }

  private AttemptRow expire(AttemptRow row) {
    return row.status().equals("IN_PROGRESS") && !now().isBefore(row.deadline())
      ? finish(row, "AUTO_SUBMITTED")
      : row;
  }

  @Transactional
  public Attempt attempt(long id, Principal p) {
    long user = access.actor(p, "STUDENT").getUserId();
    return view(expire(owned(id, user)));
  }

  @Transactional
  public Attempt answer(
    long id,
    Map<String, String> answers,
    boolean submit,
    Principal p
  ) {
    long user = access.actor(p, "STUDENT").getUserId();
    var row = expire(owned(id, user));
    if (!row.status().equals("IN_PROGRESS")) return view(row);
    var snap = read(row.data(), Snapshot.class);
    validateAnswers(snap, answers);
    String data = json(
      new Snapshot(
        snap.title(),
        snap.passingScore(),
        snap.questions(),
        new LinkedHashMap<>(answers)
      )
    );
    db.update(
      "UPDATE test_attempt SET answers_data=?,last_saved_at=? WHERE id=?",
      data,
      now(),
      id
    );
    row = new AttemptRow(
      row.id(),
      row.chapterId(),
      row.status(),
      row.deadline(),
      row.submitted(),
      data
    );
    return view(submit ? finish(row, "SUBMITTED") : row);
  }

  @Transactional
  public Attempt latest(long chapterId, Principal p) {
    long user = access.actor(p, "STUDENT").getUserId();
    var ids = db.queryForList(
      """
      SELECT a.id FROM test_attempt a JOIN test t ON t.id=a.test_id
      WHERE a.user_id=? AND t.chapter_id=? AND t.skill='KANJI' AND t.test_type='CHAPTER_TEST' AND t.lesson_id IS NULL
        AND a.status IN ('SUBMITTED','AUTO_SUBMITTED') ORDER BY a.submitted_at DESC,a.id DESC LIMIT 1
      """,
      Long.class,
      user,
      chapterId
    );
    return ids.isEmpty() ? null : view(owned(ids.getFirst(), user));
  }

  private Attempt view(AttemptRow row) {
    var snap = read(row.data(), Snapshot.class);
    return publicAttempt(
      row.id(),
      row.chapterId(),
      row.status(),
      instant(row.deadline()),
      instant(row.submitted()),
      instant(now()),
      snap
    );
  }

  static Attempt publicAttempt(
    long id,
    long lesson,
    String status,
    String deadline,
    String submitted,
    String serverTime,
    Snapshot snap
  ) {
    boolean done = !status.equals("IN_PROGRESS");
    List<QuestionView> views = new ArrayList<>();
    int count = 0;
    for (int i = 0; i < snap.questions().size(); i++) {
      var q = snap.questions().get(i);
      boolean ok = correct(q, i, snap.answers());
      if (ok) count++;
      boolean matching =
        q.questionType() == com.jtech.entity.Question.QuestionType.MATCHING;
      String solution = matching
        ? q
            .matches()
            .entrySet()
            .stream()
            .map(e -> e.getKey() + " → " + e.getValue())
            .collect(java.util.stream.Collectors.joining("\n"))
        : q.correctAnswer();
      views.add(
        new QuestionView(
          String.valueOf(i),
          q.questionType().name(),
          q.content(),
          q.options(),
          matching ? new ArrayList<>(q.matches().keySet()) : List.of(),
          matching
            ? q.matches().values().stream().sorted().toList()
            : List.of(),
          done ? solution : null,
          done ? q.explanation() : null,
          done ? ok : null
        )
      );
    }
    double score =
      Math.round((count * 10000.0) / snap.questions().size()) / 100.0;
    return new Attempt(
      id,
      lesson,
      snap.title(),
      status,
      deadline,
      submitted,
      serverTime,
      done ? score : null,
      done && score >= snap.passingScore(),
      snap.passingScore(),
      done ? count : 0,
      views,
      snap.answers()
    );
  }
}
