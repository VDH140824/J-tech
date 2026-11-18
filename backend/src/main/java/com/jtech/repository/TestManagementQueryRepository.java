package com.jtech.repository;

import com.jtech.dto.response.TestManagementResponse;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

/**
 * Quản lý bài kiểm tra (Moderator): truy vấn trên các bảng có sẵn test, test_question, test_attempt, question
 * (không thêm bảng / cột). Chỉ làm việc với MINI_TEST và CHAPTER_TEST.
 */
@Repository
public class TestManagementQueryRepository {

    /** Bộ lọc danh sách đề. */
    public record Filter(String testType, String skill, String status, Long courseId, Long chapterId, Long lessonId,
                         String keyword) {
    }

    /** Bộ lọc câu hỏi ngân hàng để chọn vào đề. */
    public record CandidateFilter(Long lessonId, Long chapterId, Collection<String> skills, String skill,
                                  String questionType, String difficulty, String keyword) {
    }

    /** Một dòng bảng test. */
    public record TestRow(Long id, String testType, String skill, Long lessonId, Long chapterId, String title,
                          String description, int durationMinutes, BigDecimal passingScore, String status) {
    }

    public record LessonInfo(Long id, Long chapterId, String skillType, String status) {
    }

    private static final int CANDIDATE_LIMIT = 500;

    private static final String SUMMARY_SQL = """
            SELECT t.id, t.test_type, t.skill, t.status, t.title,
                   c.id AS course_id, c.name AS course_name, ch.id AS chapter_id, ch.chapter_no, ch.title AS chapter_title,
                   l.id AS lesson_id, l.title AS lesson_title,
                   (SELECT COUNT(*) FROM test_question tq WHERE tq.test_id = t.id) AS question_count,
                   t.duration_minutes, t.passing_score,
                   (SELECT COUNT(*) FROM test_attempt ta WHERE ta.test_id = t.id) AS attempt_count,
                   COALESCE(t.updated_at, t.created_at) AS changed_at
            FROM test t
            LEFT JOIN lesson l ON l.id = t.lesson_id
            LEFT JOIN chapter ch ON ch.id = COALESCE(t.chapter_id, l.chapter_id)
            LEFT JOIN course c ON c.id = ch.course_id
            WHERE t.test_type IN ('MINI_TEST', 'CHAPTER_TEST')
            """;

    private static final String QUESTION_SQL = """
            SELECT q.id, q.skill, q.question_type, q.difficulty, q.status, q.is_exercise_question, q.content,
                   q.answer_data, l.id AS lesson_id, l.title AS lesson_title, l.status AS lesson_status, l.chapter_id
            FROM question q
            LEFT JOIN grammar g ON g.id = q.grammar_id
            LEFT JOIN lesson l ON l.id = COALESCE(q.lesson_id, g.lesson_id)
            """;

    private final JdbcTemplate db;

    public TestManagementQueryRepository(JdbcTemplate db) {
        this.db = db;
    }

    // ===== Danh sách / chi tiết =====
    public TestManagementResponse.Page search(Filter f, int page, int size) {
        List<Object> args = new ArrayList<>();
        StringBuilder where = new StringBuilder();
        if (f.testType() != null) {
            where.append(" AND t.test_type = ?");
            args.add(f.testType());
        }
        if (f.skill() != null) {
            where.append(" AND t.skill = ?");
            args.add(f.skill());
        }
        if (f.status() != null) {
            where.append(" AND t.status = ?");
            args.add(f.status());
        }
        if (f.courseId() != null) {
            where.append(" AND c.id = ?");
            args.add(f.courseId());
        }
        if (f.chapterId() != null) {
            where.append(" AND ch.id = ?");
            args.add(f.chapterId());
        }
        if (f.lessonId() != null) {
            where.append(" AND t.lesson_id = ?");
            args.add(f.lessonId());
        }
        if (f.keyword() != null && !f.keyword().isBlank()) {
            where.append(" AND t.title LIKE ?");
            args.add("%" + f.keyword().trim() + "%");
        }
        Long total = db.queryForObject("SELECT COUNT(*) FROM (" + SUMMARY_SQL + where + ") x", Long.class,
                args.toArray());
        long count = total == null ? 0 : total;
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(size);
        pageArgs.add((long) page * size);
        List<TestManagementResponse.Summary> rows = db.query(SUMMARY_SQL + where + " ORDER BY t.id DESC LIMIT ? OFFSET ?",
                (rs, i) -> summary(rs), pageArgs.toArray());
        return new TestManagementResponse.Page(rows, count, (int) ((count + size - 1) / size), page, size);
    }

    public Optional<TestManagementResponse.Summary> findSummary(long id) {
        return db.query(SUMMARY_SQL + " AND t.id = ?", (rs, i) -> summary(rs), id).stream().findFirst();
    }

    public Optional<TestRow> findTest(long id) {
        return db.query("""
                SELECT id, test_type, skill, lesson_id, chapter_id, title, description, duration_minutes, passing_score, status
                FROM test WHERE id = ? AND test_type IN ('MINI_TEST', 'CHAPTER_TEST')
                """, (rs, i) -> new TestRow(rs.getLong("id"), rs.getString("test_type"), rs.getString("skill"),
                nullableLong(rs, "lesson_id"), nullableLong(rs, "chapter_id"), rs.getString("title"),
                rs.getString("description"), rs.getInt("duration_minutes"), rs.getBigDecimal("passing_score"),
                rs.getString("status")), id).stream().findFirst();
    }

    /** Câu hỏi trong đề, theo thứ tự đã lưu. */
    public List<TestManagementResponse.QuestionItem> questionsOf(long testId) {
        return db.query(QUESTION_SQL + " JOIN test_question tq ON tq.question_id = q.id WHERE tq.test_id = ? ORDER BY tq.id",
                (rs, i) -> question(rs), testId);
    }

    public List<TestManagementResponse.QuestionItem> findQuestions(Collection<Long> ids) {
        if (ids.isEmpty()) return Collections.emptyList();
        String marks = ids.stream().map(id -> "?").collect(Collectors.joining(", "));
        return db.query(QUESTION_SQL + " WHERE q.id IN (" + marks + ")", (rs, i) -> question(rs), ids.toArray());
    }

    /** BR-T1, BR-T2: câu kiểm tra đang dùng trong ngân hàng, thuộc bài học (mini test) hoặc chương (test chương). */
    public List<TestManagementResponse.QuestionItem> candidates(CandidateFilter f) {
        List<Object> args = new ArrayList<>();
        StringBuilder sql = new StringBuilder(QUESTION_SQL)
                .append(" WHERE q.status = 'ACTIVE' AND q.is_exercise_question = FALSE");
        sql.append(" AND q.skill IN (")
                .append(f.skills().stream().map(s -> "?").collect(Collectors.joining(", "))).append(")");
        args.addAll(f.skills());
        if (f.lessonId() != null) {
            sql.append(" AND l.id = ?");
            args.add(f.lessonId());
        } else {
            sql.append(" AND l.chapter_id = ?");
            args.add(f.chapterId());
        }
        if (f.skill() != null) {
            sql.append(" AND q.skill = ?");
            args.add(f.skill());
        }
        if (f.questionType() != null) {
            sql.append(" AND q.question_type = ?");
            args.add(f.questionType());
        }
        if (f.difficulty() != null) {
            sql.append(" AND q.difficulty = ?");
            args.add(f.difficulty());
        }
        if (f.keyword() != null && !f.keyword().isBlank()) {
            sql.append(" AND q.content LIKE ?");
            args.add("%" + f.keyword().trim() + "%");
        }
        sql.append(" ORDER BY FIELD(q.skill, 'VOCABULARY', 'KANJI', 'GRAMMAR'), l.lesson_no, l.id, q.id LIMIT ")
                .append(CANDIDATE_LIMIT);
        return db.query(sql.toString(), (rs, i) -> question(rs), args.toArray());
    }

    public long countAttempts(long testId) {
        Long n = db.queryForObject("SELECT COUNT(*) FROM test_attempt WHERE test_id = ?", Long.class, testId);
        return n == null ? 0 : n;
    }

    public Optional<LessonInfo> lesson(long lessonId) {
        return db.query("SELECT id, chapter_id, skill_type, status FROM lesson WHERE id = ?",
                (rs, i) -> new LessonInfo(rs.getLong(1), rs.getLong(2), rs.getString(3), rs.getString(4)), lessonId)
                .stream().findFirst();
    }

    public boolean chapterExists(long chapterId) {
        Long n = db.queryForObject("SELECT COUNT(*) FROM chapter WHERE id = ?", Long.class, chapterId);
        return n != null && n > 0;
    }

    /** BR-T8: đã có đề cùng loại, cùng kỹ năng đang xuất bản cho bài học / chương này (trừ đề đang xét). */
    public boolean otherPublished(TestRow test) {
        // Mini test Từ vựng / Ngữ pháp theo bài học; mini test Kanji và test chương theo chương
        String scope = test.lessonId() != null ? "lesson_id = ?" : "lesson_id IS NULL AND chapter_id = ?";
        Long scopeId = test.lessonId() != null ? test.lessonId() : test.chapterId();
        Long n = db.queryForObject("SELECT COUNT(*) FROM test WHERE test_type = ? AND skill = ? AND " + scope
                        + " AND status = 'PUBLISHED' AND id <> ?",
                Long.class, test.testType(), test.skill(), scopeId, test.id() == null ? 0L : test.id());
        return n != null && n > 0;
    }

    // ===== Ghi =====
    public long insert(TestRow t, long userId) {
        KeyHolder key = new GeneratedKeyHolder();
        db.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO test (test_type, skill, lesson_id, chapter_id, title, description, duration_minutes,
                                      passing_score, status, created_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, t.testType());
            ps.setString(2, t.skill());
            ps.setObject(3, t.lessonId());
            ps.setObject(4, t.chapterId());
            ps.setString(5, t.title());
            ps.setString(6, t.description());
            ps.setInt(7, t.durationMinutes());
            ps.setBigDecimal(8, t.passingScore());
            ps.setString(9, t.status());
            ps.setLong(10, userId);
            return ps;
        }, key);
        Number id = key.getKey();
        if (id == null) throw new IllegalStateException("Không lấy được mã bài kiểm tra vừa tạo.");
        return id.longValue();
    }

    public void updateInfo(long id, String title, String description, int durationMinutes, BigDecimal passingScore,
            long userId) {
        db.update("""
                UPDATE test SET title = ?, description = ?, duration_minutes = ?, passing_score = ?,
                                updated_by = ?, updated_at = NOW()
                WHERE id = ?
                """, title, description, durationMinutes, passingScore, userId, id);
    }

    /** Thay toàn bộ câu hỏi của đề theo thứ tự mới; part_type = kỹ năng của câu. */
    public void replaceQuestions(long testId, List<TestManagementResponse.QuestionItem> questions) {
        db.update("DELETE FROM test_question WHERE test_id = ?", testId);
        if (questions.isEmpty()) return;
        db.batchUpdate("INSERT INTO test_question (test_id, question_id, part_type) VALUES (?, ?, ?)",
                questions.stream().map(q -> new Object[] {testId, q.id(), q.skill()}).toList());
    }

    public void updateStatus(long id, String status, long userId) {
        db.update("UPDATE test SET status = ?, updated_by = ?, updated_at = NOW() WHERE id = ?", status, userId, id);
    }

    public void delete(long id) {
        db.update("DELETE FROM test_question WHERE test_id = ?", id);
        db.update("DELETE FROM test WHERE id = ?", id);
    }

    // ===== Mapping =====
    private static TestManagementResponse.Summary summary(ResultSet rs) throws SQLException {
        Timestamp changed = rs.getTimestamp("changed_at");
        return new TestManagementResponse.Summary(rs.getLong("id"), rs.getString("test_type"), rs.getString("skill"),
                rs.getString("status"), rs.getString("title"), nullableLong(rs, "course_id"), rs.getString("course_name"),
                nullableLong(rs, "chapter_id"), (Integer) rs.getObject("chapter_no", Integer.class),
                rs.getString("chapter_title"), nullableLong(rs, "lesson_id"), rs.getString("lesson_title"),
                rs.getInt("question_count"), rs.getInt("duration_minutes"), rs.getBigDecimal("passing_score"),
                rs.getLong("attempt_count"), changed == null ? null : changed.toLocalDateTime());
    }

    private static TestManagementResponse.QuestionItem question(ResultSet rs) throws SQLException {
        return new TestManagementResponse.QuestionItem(rs.getLong("id"), rs.getString("skill"),
                rs.getString("question_type"), rs.getString("difficulty"), rs.getString("status"),
                rs.getBoolean("is_exercise_question"), rs.getString("content"), rs.getString("answer_data"),
                nullableLong(rs, "lesson_id"), rs.getString("lesson_title"), rs.getString("lesson_status"),
                nullableLong(rs, "chapter_id"));
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        return (Long) rs.getObject(column, Long.class);
    }
}
