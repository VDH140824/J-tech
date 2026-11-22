package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.KanjiExerciseRequest;
import com.jtech.dto.response.KanjiExerciseResponse;
import com.jtech.entity.*;
import com.jtech.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Validator;
import java.security.Principal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KanjiExerciseService {

  public record AnswerData(
    List<String> options,
    String correctAnswer,
    Map<String, String> matches
  ) {}

  private final EntityManager em;
  private final JdbcTemplate db;
  private final UserRepository users;
  private final ObjectMapper mapper;
  private final Validator validator;

  public KanjiExerciseService(
    EntityManager em,
    JdbcTemplate db,
    UserRepository users,
    ObjectMapper mapper,
    Validator validator
  ) {
    this.em = em;
    this.db = db;
    this.users = users;
    this.mapper = mapper;
    this.validator = validator;
  }

  private long actor(Principal principal) {
    if (principal == null) throw new AccessDeniedException(
      "Bạn cần đăng nhập."
    );
    var user = users
      .findByEmail(principal.getName())
      .orElseThrow(() ->
        new AccessDeniedException("Không tìm thấy tài khoản.")
      );
    if (
      user.getStatus() != UserStatus.ACTIVE ||
      user.getRole() == null ||
      !"MODERATOR".equals(user.getRole().getRoleName())
    ) throw new AccessDeniedException(
      "Chỉ Moderator đang hoạt động được quản lý bài tập Kanji."
    );
    return user.getUserId();
  }

  private void lesson(long id, boolean write) {
    Lesson lesson = write
      ? em.find(Lesson.class, id, LockModeType.PESSIMISTIC_WRITE)
      : em.find(Lesson.class, id);
    if (lesson == null) throw error(
      HttpStatus.NOT_FOUND,
      "Không tìm thấy bài học."
    );
    if (lesson.getSkillType() != Lesson.SkillType.KANJI) throw error(
      HttpStatus.BAD_REQUEST,
      "Bài học không thuộc kỹ năng Kanji."
    );
    if (write && lesson.getStatus() == Course.Status.ARCHIVED) throw error(
      HttpStatus.CONFLICT,
      "Không thể thay đổi bài học đã lưu trữ."
    );
  }

  private Question question(long lessonId, long id, boolean write) {
    Question q = write
      ? em.find(Question.class, id, LockModeType.PESSIMISTIC_WRITE)
      : em.find(Question.class, id);
    if (
      q == null ||
      q.getSkill() != Question.Skill.KANJI ||
      !Objects.equals(q.getLessonId(), lessonId) ||
      !Boolean.TRUE.equals(q.getIsExerciseQuestion())
    ) throw error(
      HttpStatus.NOT_FOUND,
      "Không tìm thấy bài tập Kanji trong bài học này."
    );
    return q;
  }

  @Transactional(readOnly = true)
  public Page<KanjiExerciseResponse> list(
    Principal p,
    long lessonId,
    Question.QuestionStatus status,
    int page,
    int size
  ) {
    actor(p);
    lesson(lessonId, false);
    if (page < 0 || size < 1 || size > 100) throw error(
      HttpStatus.BAD_REQUEST,
      "Phân trang không hợp lệ."
    );
    String where =
      " FROM Question q WHERE q.lessonId=:lesson AND q.skill=:skill AND q.isExerciseQuestion=true" +
      (status == null ? "" : " AND q.status=:status");
    var query = em.createQuery(
      "SELECT q" + where + " ORDER BY q.displayOrder,q.id",
      Question.class
    );
    var count = em.createQuery("SELECT COUNT(q)" + where, Long.class);
    for (var q : List.of(query, count)) {
      q.setParameter("lesson", lessonId);
      q.setParameter("skill", Question.Skill.KANJI);
      if (status != null) q.setParameter("status", status);
    }
    long offset = (long) page * size;
    if (offset > Integer.MAX_VALUE) throw error(
      HttpStatus.BAD_REQUEST,
      "Trang vượt giới hạn."
    );
    return new PageImpl<>(
      query
        .setFirstResult((int) offset)
        .setMaxResults(size)
        .getResultList()
        .stream()
        .map(this::response)
        .toList(),
      PageRequest.of(page, size),
      count.getSingleResult()
    );
  }

  @Transactional(readOnly = true)
  public KanjiExerciseResponse detail(Principal p, long lessonId, long id) {
    actor(p);
    lesson(lessonId, false);
    return response(question(lessonId, id, false));
  }

  @Transactional
  public KanjiExerciseResponse save(
    Principal p,
    long lessonId,
    Long id,
    KanjiExerciseRequest request
  ) {
    long actor = actor(p);
    lesson(lessonId, true);
    AnswerData answer = validateAnswer(request);
    Question q = id == null ? new Question() : question(lessonId, id, true);
    if (
      id != null && q.getStatus() == Question.QuestionStatus.ARCHIVED
    ) throw error(
      HttpStatus.CONFLICT,
      "Không thể sửa câu hỏi đã lưu trữ. Hãy tạo câu mới."
    );
    if (id != null && used(q)) {
      q.setStatus(Question.QuestionStatus.ARCHIVED);
      q.setUpdatedBy(actor);
      q.setUpdatedAt(LocalDateTime.now());
      q = new Question();
    }
    boolean creating = q.getId() == null;
    q.setSkill(Question.Skill.KANJI);
    q.setLessonId(lessonId);
    q.setIsExerciseQuestion(true);
    q.setStatus(Question.QuestionStatus.ACTIVE);
    q.setQuestionType(request.questionType());
    q.setContent(request.content().trim());
    q.setExplanation(Objects.toString(request.explanation(), "").trim());
    q.setDifficulty(request.difficulty());
    q.setDisplayOrder(request.displayOrder());
    try {
      q.setAnswerData(mapper.writeValueAsString(answer));
    } catch (JsonProcessingException e) {
      throw new IllegalArgumentException("Đáp án không hợp lệ.", e);
    }
    if (creating) {
      q.setCreatedBy(actor);
      q.setCreatedAt(LocalDateTime.now());
      em.persist(q);
    } else {
      q.setUpdatedBy(actor);
      q.setUpdatedAt(LocalDateTime.now());
    }
    em.flush();
    return response(q);
  }

  @Transactional
  public String delete(Principal p, long lessonId, long id) {
    long actor = actor(p);
    lesson(lessonId, true);
    Question q = question(lessonId, id, true);
    if (q.getStatus() == Question.QuestionStatus.ARCHIVED || used(q)) {
      q.setStatus(Question.QuestionStatus.ARCHIVED);
      q.setUpdatedBy(actor);
      q.setUpdatedAt(LocalDateTime.now());
      return "ARCHIVED";
    }
    em.remove(q);
    em.flush();
    return "DELETED";
  }

  private boolean used(Question q) {
    return Boolean.TRUE.equals(
      db.queryForObject(
        """
        SELECT EXISTS(SELECT 1 FROM test_question WHERE question_id=?)
            OR EXISTS(SELECT 1 FROM feedback WHERE question_id=?)
            OR EXISTS(SELECT 1 FROM practice_attempt WHERE lesson_id=? AND skill='KANJI')
        """,
        Boolean.class,
        q.getId(),
        q.getId(),
        q.getLessonId()
      )
    );
  }

  AnswerData validateAnswer(KanjiExerciseRequest r) {
    if (r == null) throw new IllegalArgumentException("Thiếu dữ liệu câu hỏi.");
    var violations = validator.validate(r);
    if (!violations.isEmpty()) throw new IllegalArgumentException(
      violations.iterator().next().getMessage()
    );
    return switch (r.questionType()) {
      case MCQ -> {
        List<String> options =
          r.options() == null
            ? List.of()
            : r.options().stream().map(String::trim).toList();
        if (
          options.size() < 2 ||
          options.size() > 6 ||
          options.stream().anyMatch(String::isBlank) ||
          options
            .stream()
            .map(KanjiExerciseService::normalize)
            .distinct()
            .count() != options.size()
        ) throw new IllegalArgumentException(
          "Trắc nghiệm cần 2–6 lựa chọn không trống, không trùng nhau."
        );
        String answer = options
          .stream()
          .filter(o -> normalize(o).equals(normalize(r.correctAnswer())))
          .findFirst()
          .orElseThrow(() ->
            new IllegalArgumentException("Chọn đáp án đúng trong các lựa chọn.")
          );
        yield new AnswerData(options, answer, Map.of());
      }
      case FILL_IN -> {
        if (
          r.correctAnswer() == null || r.correctAnswer().isBlank()
        ) throw new IllegalArgumentException(
          "Câu điền đáp án phải có đáp án đúng."
        );
        yield new AnswerData(List.of(), r.correctAnswer().trim(), Map.of());
      }
      case MATCHING -> {
        Map<String, String> pairs = r.matches();
        if (
          pairs == null ||
          pairs.size() < 2 ||
          pairs.size() > 10 ||
          pairs
            .keySet()
            .stream()
            .map(KanjiExerciseService::normalize)
            .distinct()
            .count() != pairs.size() ||
          pairs
            .values()
            .stream()
            .map(KanjiExerciseService::normalize)
            .distinct()
            .count() != pairs.size()
        ) throw new IllegalArgumentException(
          "Cần 2–10 cặp nối, mỗi vế không trống và không trùng nhau."
        );
        Map<String, String> trimmed = new LinkedHashMap<>();
        pairs.forEach((k, v) -> trimmed.put(k.trim(), v.trim()));
        yield new AnswerData(List.of(), "", trimmed);
      }
    };
  }

  private static String normalize(String s) {
    return Normalizer.normalize(
      Objects.toString(s, "").trim(),
      Normalizer.Form.NFKC
    ).toLowerCase(Locale.ROOT);
  }

  private KanjiExerciseResponse response(Question q) {
    try {
      AnswerData a = mapper.readValue(q.getAnswerData(), AnswerData.class);
      return new KanjiExerciseResponse(
        q.getId(),
        q.getLessonId(),
        q.getQuestionType(),
        q.getContent(),
        q.getExplanation(),
        q.getDifficulty(),
        q.getDisplayOrder(),
        q.getStatus(),
        a.options(),
        a.correctAnswer(),
        a.matches()
      );
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("Dữ liệu đáp án không hợp lệ.", e);
    }
  }

  private ResponseStatusException error(HttpStatus status, String message) {
    return new ResponseStatusException(status, message);
  }
}
