package com.jtech.repository;

import java.math.BigDecimal;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** Bài đọc AI: phạm vi tạo bài (môn/chương/bài), dữ liệu nguồn đã xuất bản và các reading_session của học viên. */
@Repository
public class AiReadingRepository {
    /** chapterId/chapterNo/lessonId null khi phạm vi là cả môn. */
    public record Scope(long courseId, String courseName, Long chapterId, Integer chapterNo, String chapterTitle,
        Long lessonId) {}
    public record Session(long id, long userId, Long courseId, Long chapterId, Long lessonId, String status,
        int totalQuestions, int correctCount, String questionsData, String passageData, long coinAwarded,
        LocalDateTime createdAt, LocalDateTime submittedAt) {}
    public record HistoryRow(long id, String title, String courseName, Integer chapterNo, String status,
        int totalQuestions, int correctCount, long coinAwarded, LocalDateTime createdAt, LocalDateTime submittedAt) {}

    private static final String COURSE_OK = "c.status='PUBLISHED' AND c.deleted_at IS NULL";
    private static final String SESSION_COLUMNS = """
        id,user_id,course_id,chapter_id,lesson_id,status,total_questions,correct_count,questions_data,passage_data,
        coin_awarded,created_at,submitted_at
        """;

    private final JdbcTemplate db;

    public AiReadingRepository(JdbcTemplate db) {
        this.db = db;
    }

    /** Bài READING đã xuất bản → chương và môn của nó. */
    public Optional<Scope> findLessonScope(long lessonId) {
        return db.query("""
            SELECT c.id, c.name, ch.id, ch.chapter_no, ch.title, l.id FROM lesson l
            JOIN chapter ch ON ch.id=l.chapter_id JOIN course c ON c.id=ch.course_id
            WHERE l.id=? AND l.skill_type='READING' AND l.status='PUBLISHED' AND ch.status='PUBLISHED' AND
            """ + COURSE_OK, (rs, row) -> new Scope(rs.getLong(1), rs.getString(2), rs.getLong(3), rs.getInt(4),
                rs.getString(5), rs.getLong(6)), lessonId).stream().findFirst();
    }

    public Optional<Scope> findChapterScope(long chapterId) {
        return db.query("""
            SELECT c.id, c.name, ch.id, ch.chapter_no, ch.title FROM chapter ch JOIN course c ON c.id=ch.course_id
            WHERE ch.id=? AND ch.status='PUBLISHED' AND
            """ + COURSE_OK, (rs, row) -> new Scope(rs.getLong(1), rs.getString(2), rs.getLong(3), rs.getInt(4),
                rs.getString(5), null), chapterId).stream().findFirst();
    }

    public Optional<Scope> findCourseScope(long courseId) {
        return db.query("SELECT c.id, c.name FROM course c WHERE c.id=? AND " + COURSE_OK,
            (rs, row) -> new Scope(rs.getLong(1), rs.getString(2), null, null, null, null), courseId)
            .stream().findFirst();
    }

    /** "わたし (watashi): tôi" — lấy ngẫu nhiên để mỗi lần tạo có nội dung khác nhau. */
    public List<String> findVocabulary(Scope scope, int limit) {
        return db.query("SELECT v.word, v.reading, v.meaning_vi " + sourceJoins("vocabulary v", "v") +
                " ORDER BY RAND() LIMIT ?",
            (rs, row) -> rs.getString(1) + " (" + rs.getString(2) + "): " + rs.getString(3), sourceArgs(scope, limit));
    }

    public List<String> findGrammar(Scope scope, int limit) {
        return db.query("SELECT g.structure_name, g.meaning_vi " + sourceJoins("grammar g", "g") +
                " ORDER BY RAND() LIMIT ?",
            (rs, row) -> rs.getString(1) + ": " + rs.getString(2), sourceArgs(scope, limit));
    }

    /** Chữ Hán tích lũy: mọi chương của môn đến chương đang chọn (cả môn khi không chọn chương). */
    public List<String> findKanji(Scope scope, int limit) {
        return db.query("SELECT k.character_text, k.meaning_vi FROM kanji k JOIN lesson l ON l.id=k.lesson_id " +
                "JOIN chapter ch ON ch.id=l.chapter_id WHERE k.status='PUBLISHED' AND l.status='PUBLISHED' " +
                "AND ch.status='PUBLISHED' AND ch.course_id=? AND (? IS NULL OR ch.chapter_no<=?) ORDER BY RAND() LIMIT ?",
            (rs, row) -> rs.getString(1) + " (" + rs.getString(2) + ")",
            scope.courseId(), scope.chapterNo(), scope.chapterNo(), limit);
    }

    private static String sourceJoins(String table, String alias) {
        return "FROM " + table + " JOIN lesson l ON l.id=" + alias + ".lesson_id JOIN chapter ch ON ch.id=l.chapter_id " +
            "WHERE " + alias + ".status='PUBLISHED' AND l.status='PUBLISHED' AND ch.status='PUBLISHED' " +
            "AND ch.course_id=? AND (? IS NULL OR ch.id=?)";
    }

    private static Object[] sourceArgs(Scope scope, int limit) {
        return new Object[] {scope.courseId(), scope.chapterId(), scope.chapterId(), limit};
    }

    /** Số bài đã tạo thành công (không tính FAILED) kể từ một thời điểm. */
    public int countCreatedSince(long studentId, LocalDateTime since) {
        Integer count = db.queryForObject("""
            SELECT COUNT(*) FROM reading_session WHERE user_id=? AND status<>'FAILED' AND created_at>=?
            """, Integer.class, studentId, since);
        return count == null ? 0 : count;
    }

    /** Bài đã tạo cho lesson nhưng chưa nộp — dùng lại thay vì tạo bài mới khi học viên mở lại link. */
    public Optional<Session> findGeneratedForLesson(long studentId, long lessonId) {
        return db.query("SELECT " + SESSION_COLUMNS + """
            FROM reading_session WHERE user_id=? AND lesson_id=? AND status='GENERATED'
            ORDER BY created_at DESC, id DESC LIMIT 1
            """, (rs, row) -> session(rs), studentId, lessonId).stream().findFirst();
    }

    /**
     * Bài đã tạo thành công cho cùng môn và chương (bất kỳ học viên nào) — dùng lại khi AI không trả lời.
     * Ưu tiên bài của học viên khác vì học viên này chưa đọc.
     */
    public Optional<Session> findReusablePassage(Scope scope, long studentId) {
        return db.query("SELECT " + SESSION_COLUMNS + """
            FROM reading_session
            WHERE status IN ('GENERATED','SUBMITTED') AND passage_data IS NOT NULL AND questions_data IS NOT NULL
                AND total_questions>0 AND course_id=? AND chapter_id <=> ?
            ORDER BY user_id=? , RAND() LIMIT 1
            """, (rs, row) -> session(rs), scope.courseId(), scope.chapterId(), studentId).stream().findFirst();
    }

    public long createSession(long studentId, Scope scope, String status, int totalQuestions, String questionsJson,
            String passageJson, int inputTokens, int outputTokens, LocalDateTime created) {
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO reading_session(user_id,course_id,chapter_id,lesson_id,status,total_questions,
                    questions_data,passage_data,input_tokens,output_tokens,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, studentId);
            statement.setLong(2, scope.courseId());
            statement.setObject(3, scope.chapterId());
            statement.setObject(4, scope.lessonId());
            statement.setString(5, status);
            statement.setInt(6, totalQuestions);
            statement.setString(7, questionsJson);
            statement.setString(8, passageJson);
            statement.setInt(9, Math.max(0, inputTokens));
            statement.setInt(10, Math.max(0, outputTokens));
            statement.setObject(11, created);
            return statement;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }

    public Optional<Session> findSession(long id) {
        return db.query("SELECT " + SESSION_COLUMNS + " FROM reading_session WHERE id=?", (rs, row) -> session(rs), id)
            .stream().findFirst();
    }

    /** Khóa dòng để hai lần nộp đồng thời không cùng chấm và thưởng xu. */
    public Optional<Session> lockSession(long id) {
        return db.query("SELECT " + SESSION_COLUMNS + " FROM reading_session WHERE id=? FOR UPDATE",
            (rs, row) -> session(rs), id).stream().findFirst();
    }

    public void markSubmitted(long id, int correctCount, String answersJson, LocalDateTime submitted) {
        db.update("""
            UPDATE reading_session SET status='SUBMITTED', correct_count=?, submitted_at=?,
                passage_data=JSON_SET(COALESCE(passage_data, JSON_OBJECT()), '$.answers', CAST(? AS JSON))
            WHERE id=?
            """, correctCount, submitted, answersJson, id);
    }

    public void saveSessionCoins(long id, long coins) {
        db.update("UPDATE reading_session SET coin_awarded=? WHERE id=?", coins, id);
    }

    public List<HistoryRow> findHistory(long studentId, int limit, int offset) {
        return db.query("""
            SELECT s.id, JSON_UNQUOTE(JSON_EXTRACT(s.passage_data,'$.title')), c.name, ch.chapter_no, s.status,
                s.total_questions, s.correct_count, s.coin_awarded, s.created_at, s.submitted_at
            FROM reading_session s
            LEFT JOIN course c ON c.id=s.course_id
            LEFT JOIN chapter ch ON ch.id=s.chapter_id
            WHERE s.user_id=? AND s.status<>'FAILED'
            ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?
            """, (rs, row) -> new HistoryRow(rs.getLong(1), rs.getString(2), rs.getString(3),
                (Integer) rs.getObject(4, Integer.class), rs.getString(5), rs.getInt(6), rs.getInt(7), rs.getLong(8),
                rs.getObject(9, LocalDateTime.class), rs.getObject(10, LocalDateTime.class)),
            studentId, limit, offset);
    }

    public long countHistory(long studentId) {
        Long count = db.queryForObject("SELECT COUNT(*) FROM reading_session WHERE user_id=? AND status<>'FAILED'",
            Long.class, studentId);
        return count == null ? 0 : count;
    }

    public boolean isLessonCompleted(long studentId, long lessonId) {
        return Boolean.TRUE.equals(db.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM lesson_section_progress
            WHERE user_id=? AND lesson_id=? AND section_type='READING' AND completed_at IS NOT NULL)
            """, Boolean.class, studentId, lessonId));
    }

    /** Lần đạt đầu tiên giữ nguyên completed_at; điểm tốt nhất luôn được cập nhật. */
    public void saveLessonCompletion(long studentId, long lessonId, BigDecimal score, LocalDateTime time) {
        db.update("""
            INSERT INTO lesson_section_progress(user_id,lesson_id,section_type,exercise_completed_at,completed_at,
                best_exercise_score,updated_at)
            VALUES (?,?,'READING',?,?,?,?)
            ON DUPLICATE KEY UPDATE
                exercise_completed_at=COALESCE(exercise_completed_at,VALUES(exercise_completed_at)),
                completed_at=COALESCE(completed_at,VALUES(completed_at)),
                best_exercise_score=GREATEST(COALESCE(best_exercise_score,0),VALUES(best_exercise_score)),
                updated_at=VALUES(updated_at)
            """, studentId, lessonId, time, time, score, time);
    }

    private static Session session(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Session(rs.getLong(1), rs.getLong(2), rs.getObject(3, Long.class), rs.getObject(4, Long.class),
            rs.getObject(5, Long.class), rs.getString(6), rs.getInt(7), rs.getInt(8), rs.getString(9),
            rs.getString(10), rs.getLong(11), rs.getObject(12, LocalDateTime.class),
            rs.getObject(13, LocalDateTime.class));
    }
}
