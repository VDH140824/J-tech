package com.jtech.repository;

import com.jtech.dto.response.QuestionBankResponse;
import com.jtech.entity.Question;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * UC-39 Manage Question Bank: truy vấn đọc trên bảng question có sẵn (không thêm bảng / cột).
 * Chỉ gồm câu hỏi Từ vựng, Kanji, Ngữ pháp; khóa học / chương / bài học suy ra từ lesson_id hoặc grammar.lesson_id.
 */
@Repository
public class QuestionBankQueryRepository {

    public record Filter(Question.Skill skill, Question.QuestionType questionType, Question.QuestionStatus status,
                         Long courseId, Long chapterId, Long lessonId, String keyword, Long testId) {
    }

    private static final String FROM = """
            FROM question q
            LEFT JOIN grammar g ON g.id = q.grammar_id
            LEFT JOIN lesson l ON l.id = COALESCE(q.lesson_id, g.lesson_id)
            LEFT JOIN chapter ch ON ch.id = l.chapter_id
            LEFT JOIN course c ON c.id = ch.course_id
            """;

    private static final String COLUMNS = """
            SELECT q.id, q.skill, q.question_type, q.difficulty, q.status, q.content, q.is_exercise_question,
                   COALESCE(q.updated_at, q.created_at) AS changed_at,
                   c.id AS course_id, c.name AS course_name, ch.id AS chapter_id, ch.chapter_no, ch.title AS chapter_title,
                   l.id AS lesson_id, l.title AS lesson_title, g.structure_name
            """;

    /** Kỹ năng thuộc ngân hàng câu hỏi (UC-39). */
    public static final String BANK_SKILLS = "q.skill IN ('VOCABULARY', 'KANJI', 'GRAMMAR')";

    private final JdbcTemplate db;

    public QuestionBankQueryRepository(JdbcTemplate db) {
        this.db = db;
    }

    /** A1: lọc theo khóa học, chương, bài học, kỹ năng, dạng câu, trạng thái, từ khóa; mới nhất trước. */
    public QuestionBankResponse.Page search(Filter filter, int page, int size) {
        List<Object> args = new ArrayList<>();
        String where = where(filter, args);
        Long total = db.queryForObject("SELECT COUNT(*) " + FROM + where, Long.class, args.toArray());
        long count = total == null ? 0 : total;
        List<Object> pageArgs = new ArrayList<>(args);
        pageArgs.add(size);
        pageArgs.add((long) page * size);
        List<QuestionBankResponse.Summary> rows = db.query(
                COLUMNS + FROM + where + " ORDER BY q.id DESC LIMIT ? OFFSET ?",
                (rs, i) -> summary(rs), pageArgs.toArray());
        int pages = (int) ((count + size - 1) / size);
        return new QuestionBankResponse.Page(rows, count, pages, page, size);
    }

    public Optional<QuestionBankResponse.Summary> findSummary(long id) {
        return db.query(COLUMNS + FROM + " WHERE q.id = ? AND " + BANK_SKILLS, (rs, i) -> summary(rs), id)
                .stream().findFirst();
    }

    private static String where(Filter f, List<Object> args) {
        StringBuilder sql = new StringBuilder(" WHERE " + BANK_SKILLS);
        if (f.skill() != null) {
            sql.append(" AND q.skill = ?");
            args.add(f.skill().name());
        }
        if (f.questionType() != null) {
            sql.append(" AND q.question_type = ?");
            args.add(f.questionType().name());
        }
        if (f.status() != null) {
            sql.append(" AND q.status = ?");
            args.add(f.status().name());
        }
        if (f.courseId() != null) {
            sql.append(" AND c.id = ?");
            args.add(f.courseId());
        }
        if (f.chapterId() != null) {
            sql.append(" AND ch.id = ?");
            args.add(f.chapterId());
        }
        if (f.lessonId() != null) {
            sql.append(" AND l.id = ?");
            args.add(f.lessonId());
        }
        if (f.testId() != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM test_question tq WHERE tq.question_id = q.id AND tq.test_id = ?)");
            args.add(f.testId());
        }
        if (f.keyword() != null && !f.keyword().isBlank()) {
            sql.append(" AND q.content LIKE ?");
            args.add("%" + f.keyword().trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        return sql.toString();
    }

    private static QuestionBankResponse.Summary summary(ResultSet rs) throws SQLException {
        Timestamp changed = rs.getTimestamp("changed_at");
        String target = rs.getString("structure_name");
        return new QuestionBankResponse.Summary(
                rs.getLong("id"),
                Question.Skill.valueOf(rs.getString("skill")),
                Question.QuestionType.valueOf(rs.getString("question_type")),
                Question.Difficulty.valueOf(rs.getString("difficulty")),
                Question.QuestionStatus.valueOf(rs.getString("status")),
                rs.getString("content"),
                rs.getBoolean("is_exercise_question"),
                (Long) rs.getObject("course_id", Long.class),
                rs.getString("course_name"),
                (Long) rs.getObject("chapter_id", Long.class),
                (Integer) rs.getObject("chapter_no", Integer.class),
                rs.getString("chapter_title"),
                (Long) rs.getObject("lesson_id", Long.class),
                rs.getString("lesson_title"),
                target,
                changed == null ? null : changed.toLocalDateTime());
    }

    // ===== Dữ liệu cho bộ lọc / chọn nơi gắn câu hỏi =====
    public QuestionBankResponse.Targets targets() {
        return new QuestionBankResponse.Targets(
                db.query("SELECT id, name FROM course WHERE deleted_at IS NULL ORDER BY display_order, id",
                        (rs, i) -> new QuestionBankResponse.CourseItem(rs.getLong(1), rs.getString(2))),
                db.query("SELECT id, course_id, chapter_no, title FROM chapter ORDER BY course_id, chapter_no, id",
                        (rs, i) -> new QuestionBankResponse.ChapterItem(rs.getLong(1), rs.getLong(2), rs.getInt(3),
                                rs.getString(4))),
                db.query("SELECT id, chapter_id, skill_type, lesson_no, title FROM lesson "
                        + "WHERE skill_type IN ('VOCABULARY', 'KANJI', 'GRAMMAR') ORDER BY chapter_id, lesson_no, id",
                        (rs, i) -> new QuestionBankResponse.LessonItem(rs.getLong(1), rs.getLong(2), rs.getString(3),
                                rs.getInt(4), rs.getString(5))),
                db.query("SELECT id, lesson_id, structure_name FROM grammar ORDER BY lesson_id, display_order, id",
                        (rs, i) -> new QuestionBankResponse.GrammarItem(rs.getLong(1), rs.getLong(2), rs.getString(3))),
                db.query("""
                        SELECT t.id, t.test_type, t.skill, t.title, COALESCE(t.chapter_id, l.chapter_id), t.lesson_id
                        FROM test t LEFT JOIN lesson l ON l.id = t.lesson_id
                        WHERE t.status <> 'ARCHIVED' AND t.test_type IN ('MINI_TEST', 'CHAPTER_TEST')
                        ORDER BY FIELD(t.test_type, 'MINI_TEST', 'CHAPTER_TEST'), t.title, t.id
                        """,
                        (rs, i) -> new QuestionBankResponse.TestOption(rs.getLong(1), rs.getString(2), rs.getString(3),
                                rs.getString(4), (Long) rs.getObject(5, Long.class), (Long) rs.getObject(6, Long.class))));
    }

    // ===== Kiểm tra nơi gắn câu hỏi =====
    /** Loại kỹ năng của bài học (KANJI / VOCABULARY / ...), rỗng nếu bài học không tồn tại. */
    public Optional<String> findLessonSkill(long lessonId) {
        return db.query("SELECT skill_type FROM lesson WHERE id = ?", (rs, i) -> rs.getString(1), lessonId)
                .stream().findFirst();
    }

    /** Bài học chứa điểm ngữ pháp, rỗng nếu điểm ngữ pháp không tồn tại. */
    public Optional<Long> findGrammarLesson(long grammarId) {
        return db.query("SELECT lesson_id FROM grammar WHERE id = ?", (rs, i) -> rs.getLong(1), grammarId)
                .stream().findFirst();
    }

    // ===== Gắn câu hỏi vào đề kiểm tra (test_question, không thêm bảng / cột) =====
    private static final String TEST_COLUMNS = """
            SELECT t.id, t.test_type, t.skill, t.title, t.status,
                   EXISTS(SELECT 1 FROM test_attempt ta WHERE ta.test_id = t.id) AS locked
            """;

    private static QuestionBankResponse.TestItem testItem(ResultSet rs) throws SQLException {
        return new QuestionBankResponse.TestItem(rs.getLong("id"), rs.getString("test_type"), rs.getString("skill"),
                rs.getString("title"), rs.getString("status"), rs.getBoolean("locked"));
    }

    /**
     * Đề có thể gắn câu hỏi của bài học: mini test của chính bài học (cùng kỹ năng)
     * và test chương tổng hợp (skill = ALL) của chương chứa bài học. Bỏ qua đề đã lưu trữ.
     */
    public List<QuestionBankResponse.TestItem> availableTests(long lessonId, String skill) {
        return db.query(TEST_COLUMNS + """
                FROM test t JOIN lesson l ON l.id = ?
                WHERE t.status <> 'ARCHIVED'
                  AND ((t.test_type = 'MINI_TEST' AND t.lesson_id = l.id AND t.skill IN (?, 'ALL'))
                    OR (t.test_type = 'CHAPTER_TEST' AND t.chapter_id = l.chapter_id AND t.lesson_id IS NULL
                        AND t.skill = 'ALL'))
                ORDER BY FIELD(t.test_type, 'MINI_TEST', 'CHAPTER_TEST'), t.id
                """, (rs, i) -> testItem(rs), lessonId, skill);
    }

    /** Các đề đang chứa câu hỏi. */
    public List<QuestionBankResponse.TestItem> linkedTests(long questionId) {
        return db.query(TEST_COLUMNS + """
                FROM test_question tq JOIN test t ON t.id = tq.test_id
                WHERE tq.question_id = ?
                ORDER BY FIELD(t.test_type, 'MINI_TEST', 'LESSON_TEST', 'CHAPTER_TEST'), t.id
                """, (rs, i) -> testItem(rs), questionId);
    }

    public void linkTest(long testId, long questionId, String partType) {
        db.update("INSERT IGNORE INTO test_question (test_id, question_id, part_type) VALUES (?, ?, ?)",
                testId, questionId, partType);
    }

    public void unlinkTest(long testId, long questionId) {
        db.update("DELETE FROM test_question WHERE test_id = ? AND question_id = ?", testId, questionId);
    }

    // ===== BR-29 / BR-13 =====
    /**
     * BR-29: câu hỏi đã có học viên làm khi nằm trong bài kiểm tra đã có lượt làm (test_attempt),
     * hoặc xuất hiện trong đáp án của một lượt luyện tập (practice_attempt.answers_data.answers lưu theo id câu).
     */
    public boolean hasAttempts(long questionId) {
        return Boolean.TRUE.equals(db.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM test_question tq JOIN test_attempt ta ON ta.test_id = tq.test_id
                              WHERE tq.question_id = ?)
                    OR EXISTS(SELECT 1 FROM practice_attempt pa
                              WHERE JSON_CONTAINS_PATH(pa.answers_data, 'one', CONCAT('$.answers."', ?, '"')))
                """, Boolean.class, questionId, String.valueOf(questionId)));
    }

    /** Câu hỏi đang thuộc một bài kiểm tra (test_question tham chiếu khóa ngoại tới question). */
    public boolean isInTest(long questionId) {
        return Boolean.TRUE.equals(db.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM test_question WHERE question_id = ?)", Boolean.class, questionId));
    }

    /** Có phản hồi của học viên về câu hỏi (feedback tham chiếu khóa ngoại tới question). */
    public boolean hasFeedback(long questionId) {
        return Boolean.TRUE.equals(db.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM feedback WHERE question_id = ?)", Boolean.class, questionId));
    }

}
