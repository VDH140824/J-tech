package com.jtech.repository;

import com.jtech.dto.response.StudentGrammarResponse;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * Màn Grammar của học viên: đọc grammar, question, test, test_question và ghi test_attempt
 * (bảng có sẵn, không thêm bảng / cột).
 */
@Repository
public class StudentGrammarQueryRepository {

    public record LessonRow(Long id, Long chapterId, Integer chapterNo, String chapterTitle, String courseName,
                            Integer lessonNo, String title, String description) {
    }

    public record QuestionRow(Long id, String questionType, String content, String explanation, String answerData,
                              String grammarName) {
    }

    public record TestRow(Long id, Long lessonId, String title, int durationMinutes, BigDecimal passingScore) {
    }

    public record AttemptRow(Long id, Long testId, Long userId, int attemptNo, String status, String answersData,
                             LocalDateTime startedAt, LocalDateTime deadlineAt, LocalDateTime submittedAt,
                             BigDecimal score, int correctCount, int totalQuestions, Boolean passed,
                             long timeSpentSec) {
    }

    private static final String QUESTION_SQL = """
            SELECT q.id, q.question_type, q.content, q.explanation, q.answer_data, g.structure_name
            FROM question q
            LEFT JOIN grammar g ON g.id = q.grammar_id
            """;

    private static final String ATTEMPT_SQL = """
            SELECT id, test_id, user_id, attempt_no, status, answers_data, started_at, deadline_at, submitted_at,
                   score, correct_count, total_questions, is_passed, time_spent_sec
            FROM test_attempt
            """;

    private final JdbcTemplate db;

    public StudentGrammarQueryRepository(JdbcTemplate db) {
        this.db = db;
    }

    /** Bài Ngữ pháp mà học viên được xem: bài, chương, khóa học đều đã xuất bản. */
    public Optional<LessonRow> publishedGrammarLesson(long lessonId) {
        return db.query("""
                SELECT l.id, l.chapter_id, ch.chapter_no, ch.title AS chapter_title, c.name AS course_name,
                       l.lesson_no, l.title, l.description
                FROM lesson l
                JOIN chapter ch ON ch.id = l.chapter_id
                JOIN course c ON c.id = ch.course_id
                WHERE l.id = ? AND l.skill_type = 'GRAMMAR' AND l.status = 'PUBLISHED'
                  AND ch.status = 'PUBLISHED' AND c.status = 'PUBLISHED'
                """, (rs, i) -> new LessonRow(rs.getLong("id"), rs.getLong("chapter_id"), rs.getInt("chapter_no"),
                rs.getString("chapter_title"), rs.getString("course_name"), rs.getInt("lesson_no"),
                rs.getString("title"), rs.getString("description")), lessonId).stream().findFirst();
    }

    public List<StudentGrammarResponse.GrammarPoint> grammars(long lessonId) {
        return db.query("""
                SELECT id, structure_name, meaning_vi, usage_explanation, example_jp, example_vi, video_url,
                       video_duration_sec
                FROM grammar WHERE lesson_id = ? AND status = 'PUBLISHED'
                ORDER BY display_order, id
                """, (rs, i) -> new StudentGrammarResponse.GrammarPoint(rs.getLong("id"),
                rs.getString("structure_name"), rs.getString("meaning_vi"), rs.getString("usage_explanation"),
                rs.getString("example_jp"), rs.getString("example_vi"), rs.getString("video_url"),
                (Integer) rs.getObject("video_duration_sec", Integer.class)), lessonId);
    }

    /** Grammar Exercise: câu luyện tập (is_exercise_question = TRUE) đang dùng của bài, điểm ngữ pháp đã xuất bản. */
    public List<QuestionRow> exerciseQuestions(long lessonId) {
        return db.query(QUESTION_SQL + """
                WHERE q.skill = 'GRAMMAR' AND q.status = 'ACTIVE' AND q.is_exercise_question = TRUE
                  AND COALESCE(q.lesson_id, g.lesson_id) = ?
                  AND (g.id IS NULL OR g.status = 'PUBLISHED')
                ORDER BY g.display_order, q.display_order, q.id
                """, (rs, i) -> question(rs), lessonId);
    }

    public int countExerciseQuestions(long lessonId) {
        Integer n = db.queryForObject("""
                SELECT COUNT(*) FROM question q LEFT JOIN grammar g ON g.id = q.grammar_id
                WHERE q.skill = 'GRAMMAR' AND q.status = 'ACTIVE' AND q.is_exercise_question = TRUE
                  AND COALESCE(q.lesson_id, g.lesson_id) = ? AND (g.id IS NULL OR g.status = 'PUBLISHED')
                """, Integer.class, lessonId);
        return n == null ? 0 : n;
    }

    public List<QuestionRow> questionsByIds(Collection<Long> ids) {
        if (ids.isEmpty()) return List.of();
        String marks = ids.stream().map(id -> "?").collect(Collectors.joining(", "));
        return db.query(QUESTION_SQL + " WHERE q.id IN (" + marks + ")", (rs, i) -> question(rs), ids.toArray());
    }

    /** Mini test Ngữ pháp đang xuất bản của bài học (mới nhất). */
    public Optional<TestRow> publishedMiniTest(long lessonId) {
        return db.query("""
                SELECT id, lesson_id, title, duration_minutes, passing_score FROM test
                WHERE test_type = 'MINI_TEST' AND skill = 'GRAMMAR' AND lesson_id = ? AND status = 'PUBLISHED'
                ORDER BY id DESC LIMIT 1
                """, (rs, i) -> test(rs), lessonId).stream().findFirst();
    }

    /** Đề mini test Ngữ pháp (kể cả đã lưu trữ, để xem lại kết quả cũ). */
    public Optional<TestRow> miniTest(long testId) {
        return db.query("""
                SELECT id, lesson_id, title, duration_minutes, passing_score FROM test
                WHERE id = ? AND test_type = 'MINI_TEST' AND skill = 'GRAMMAR'
                """, (rs, i) -> test(rs), testId).stream().findFirst();
    }

    public boolean isPublished(long testId) {
        Integer n = db.queryForObject("SELECT COUNT(*) FROM test WHERE id = ? AND status = 'PUBLISHED'", Integer.class,
                testId);
        return n != null && n > 0;
    }

    /** Câu hỏi của đề theo thứ tự trong đề. */
    public List<QuestionRow> testQuestions(long testId) {
        return db.query(QUESTION_SQL + " JOIN test_question tq ON tq.question_id = q.id WHERE tq.test_id = ? ORDER BY tq.id",
                (rs, i) -> question(rs), testId);
    }

    public List<AttemptRow> attempts(long testId, long userId) {
        return db.query(ATTEMPT_SQL + " WHERE test_id = ? AND user_id = ? ORDER BY attempt_no DESC",
                (rs, i) -> attempt(rs), testId, userId);
    }

    public Optional<AttemptRow> attempt(long id) {
        return db.query(ATTEMPT_SQL + " WHERE id = ?", (rs, i) -> attempt(rs), id).stream().findFirst();
    }

    public int nextAttemptNo(long testId, long userId) {
        Integer n = db.queryForObject("SELECT COALESCE(MAX(attempt_no), 0) + 1 FROM test_attempt WHERE test_id = ? AND user_id = ?",
                Integer.class, testId, userId);
        return n == null ? 1 : n;
    }

    public long insertAttempt(long testId, long userId, int attemptNo, int totalQuestions, String answersData,
            LocalDateTime startedAt, LocalDateTime deadlineAt) {
        KeyHolder key = new GeneratedKeyHolder();
        db.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO test_attempt (test_id, user_id, attempt_no, total_questions, answers_data,
                                              started_at, deadline_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'IN_PROGRESS')
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, testId);
            ps.setLong(2, userId);
            ps.setInt(3, attemptNo);
            ps.setInt(4, totalQuestions);
            ps.setString(5, answersData);
            ps.setTimestamp(6, Timestamp.valueOf(startedAt));
            ps.setTimestamp(7, Timestamp.valueOf(deadlineAt));
            return ps;
        }, key);
        Number id = key.getKey();
        if (id == null) throw new IllegalStateException("Không tạo được lượt làm bài.");
        return id.longValue();
    }

    public void saveAnswers(long attemptId, String answersData, LocalDateTime savedAt) {
        db.update("UPDATE test_attempt SET answers_data = ?, last_saved_at = ? WHERE id = ? AND status = 'IN_PROGRESS'",
                answersData, Timestamp.valueOf(savedAt), attemptId);
    }

    /** Chấm xong: chỉ cập nhật lượt đang làm (tránh nộp hai lần). Trả về số dòng cập nhật. */
    public int finish(long attemptId, String status, String answersData, int correctCount, BigDecimal score,
            boolean passed, LocalDateTime submittedAt) {
        return db.update("""
                UPDATE test_attempt
                SET status = ?, answers_data = ?, correct_count = ?, score = ?, is_passed = ?, submitted_at = ?,
                    last_saved_at = ?, time_spent_sec = GREATEST(0, TIMESTAMPDIFF(SECOND, started_at, LEAST(?, deadline_at)))
                WHERE id = ? AND status = 'IN_PROGRESS'
                """, status, answersData, correctCount, score, passed, Timestamp.valueOf(submittedAt),
                Timestamp.valueOf(submittedAt), Timestamp.valueOf(submittedAt), attemptId);
    }

    // ===== Mapping =====
    private static QuestionRow question(ResultSet rs) throws SQLException {
        return new QuestionRow(rs.getLong("id"), rs.getString("question_type"), rs.getString("content"),
                rs.getString("explanation"), rs.getString("answer_data"), rs.getString("structure_name"));
    }

    private static TestRow test(ResultSet rs) throws SQLException {
        return new TestRow(rs.getLong("id"), rs.getLong("lesson_id"), rs.getString("title"),
                rs.getInt("duration_minutes"), rs.getBigDecimal("passing_score"));
    }

    private static AttemptRow attempt(ResultSet rs) throws SQLException {
        return new AttemptRow(rs.getLong("id"), rs.getLong("test_id"), rs.getLong("user_id"), rs.getInt("attempt_no"),
                rs.getString("status"), rs.getString("answers_data"), time(rs, "started_at"), time(rs, "deadline_at"),
                time(rs, "submitted_at"), rs.getBigDecimal("score"), rs.getInt("correct_count"),
                rs.getInt("total_questions"), (Boolean) rs.getObject("is_passed", Boolean.class),
                rs.getLong("time_spent_sec"));
    }

    private static LocalDateTime time(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }
}
