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

/** Bài nghe của học viên: một listening_exercise gắn với một lesson LISTENING. Chỉ đọc nội dung đã xuất bản. */
@Repository
public class ListeningRepository {
    public record LessonItem(long lessonId, String title, long courseId, String courseName, int chapterNo, boolean completed) {}
    public record Exercise(long exerciseId, long lessonId, long courseId, String courseName, int chapterNo,
        String title, String audioUrl, String scriptJp, String scriptVi) {}
    public record QuestionRow(long id, String content, String explanation, String answerData) {}

    private static final String PUBLISHED = """
        le.status='PUBLISHED' AND l.status='PUBLISHED' AND l.skill_type='LISTENING'
        AND ch.status='PUBLISHED' AND c.status='PUBLISHED' AND c.deleted_at IS NULL
        """;
    private static final String JOINS = """
        FROM listening_exercise le
        JOIN lesson l ON l.id=le.lesson_id
        JOIN chapter ch ON ch.id=l.chapter_id
        JOIN course c ON c.id=ch.course_id
        """;

    private final JdbcTemplate db;

    public ListeningRepository(JdbcTemplate db) {
        this.db = db;
    }

    /** courseId null = mọi môn. Thứ tự: môn → chương → bài. */
    public List<LessonItem> findPublishedLessons(Long courseId, long studentId) {
        String sql = "SELECT l.id, le.title, c.id, c.name, ch.chapter_no, EXISTS(SELECT 1 FROM lesson_section_progress p " +
            "WHERE p.user_id=? AND p.lesson_id=l.id AND p.section_type='LISTENING' AND p.completed_at IS NOT NULL) " +
            JOINS + "WHERE " + PUBLISHED + (courseId == null ? "" : " AND c.id=?") +
            " ORDER BY c.display_order, c.id, ch.display_order, ch.chapter_no, l.lesson_no, l.id";
        Object[] args = courseId == null ? new Object[] {studentId} : new Object[] {studentId, courseId};
        return db.query(sql, (rs, row) -> new LessonItem(rs.getLong(1), rs.getString(2), rs.getLong(3),
            rs.getString(4), rs.getInt(5), rs.getBoolean(6)), args);
    }

    public Optional<Exercise> findPublishedExercise(long lessonId) {
        return db.query("SELECT le.id, l.id, c.id, c.name, ch.chapter_no, le.title, le.video_url, le.script_jp, le.script_vi " +
                JOINS + "WHERE l.id=? AND " + PUBLISHED,
            (rs, row) -> new Exercise(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getString(4), rs.getInt(5),
                rs.getString(6), rs.getString(7), rs.getString(8), rs.getString(9)), lessonId).stream().findFirst();
    }

    public List<QuestionRow> findQuestions(long exerciseId) {
        return db.query("""
            SELECT id, content, explanation, answer_data FROM question
            WHERE listening_exercise_id=? AND status='ACTIVE' AND question_type='MCQ'
            ORDER BY display_order, id
            """, (rs, row) -> new QuestionRow(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4)), exerciseId);
    }

    public boolean isCompleted(long studentId, long lessonId) {
        return Boolean.TRUE.equals(db.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM lesson_section_progress
            WHERE user_id=? AND lesson_id=? AND section_type='LISTENING' AND completed_at IS NOT NULL)
            """, Boolean.class, studentId, lessonId));
    }

    public long saveAttempt(long studentId, long lessonId, long exerciseId, int total, int correct, BigDecimal score,
            String answersJson, LocalDateTime submitted) {
        Integer attemptNo = db.queryForObject("""
            SELECT COALESCE(MAX(attempt_no),0)+1 FROM practice_attempt
            WHERE user_id=? AND listening_exercise_id=? AND activity_type='LISTENING'
            """, Integer.class, studentId, exerciseId);
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO practice_attempt(user_id,activity_type,lesson_id,skill,difficulty_level,listening_exercise_id,
                    attempt_no,status,total_questions,correct_count,score,answers_data,started_at,submitted_at)
                VALUES (?,'LISTENING',?,'LISTENING','EASY',?,?,'COMPLETED',?,?,?,?,?,?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, studentId);
            statement.setLong(2, lessonId);
            statement.setLong(3, exerciseId);
            statement.setInt(4, attemptNo == null ? 1 : attemptNo);
            statement.setInt(5, total);
            statement.setInt(6, correct);
            statement.setBigDecimal(7, score);
            statement.setString(8, answersJson);
            statement.setObject(9, submitted);
            statement.setObject(10, submitted);
            return statement;
        }, key);
        return Objects.requireNonNull(key.getKey()).longValue();
    }

    public void saveAttemptCoins(long attemptId, long coins) {
        db.update("UPDATE practice_attempt SET coin_awarded=? WHERE id=?", coins, attemptId);
    }

    /** Lần đạt đầu tiên giữ nguyên completed_at; điểm tốt nhất luôn được cập nhật. */
    public void saveLessonCompletion(long studentId, long lessonId, BigDecimal score, LocalDateTime time) {
        db.update("""
            INSERT INTO lesson_section_progress(user_id,lesson_id,section_type,exercise_completed_at,completed_at,
                best_exercise_score,updated_at)
            VALUES (?,?,'LISTENING',?,?,?,?)
            ON DUPLICATE KEY UPDATE
                exercise_completed_at=COALESCE(exercise_completed_at,VALUES(exercise_completed_at)),
                completed_at=COALESCE(completed_at,VALUES(completed_at)),
                best_exercise_score=GREATEST(COALESCE(best_exercise_score,0),VALUES(best_exercise_score)),
                updated_at=VALUES(updated_at)
            """, studentId, lessonId, time, time, score, time);
    }
}
