package com.jtech.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.VocabularyMiniTestResponse;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class LearningProgressRepository {
    public enum ContentType { VOCABULARY, KANJI, GRAMMAR }
    private final JdbcTemplate db;
    private final ObjectMapper json;
    public LearningProgressRepository(JdbcTemplate db, ObjectMapper json) {
        this.db = db;
        this.json = json;
    }

    public boolean isPublished(ContentType type, long contentId) {
        // Identifiers come exclusively from the enum, never from a supplied SQL fragment.
        String table = type.name().toLowerCase(java.util.Locale.ROOT);
        return Boolean.TRUE.equals(db.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM " + table + " i JOIN lesson l ON l.id=i.lesson_id " +
            "JOIN chapter ch ON ch.id=l.chapter_id JOIN course c ON c.id=ch.course_id " +
            "WHERE i.id=? AND i.status='PUBLISHED' AND l.status='PUBLISHED' " +
            "AND ch.status='PUBLISHED' AND c.status='PUBLISHED')", Boolean.class, contentId));
    }

    public void saveFirstCompletion(long studentId, ContentType type, long contentId, LocalDateTime time) {
        String column = type.name().toLowerCase(java.util.Locale.ROOT) + "_id";
        db.update("INSERT INTO learning_item_progress(user_id," + column + ",first_completed_at) VALUES (?,?,?) " +
            "ON DUPLICATE KEY UPDATE first_completed_at=COALESCE(first_completed_at,VALUES(first_completed_at))",
            studentId, contentId, time);
    }

    public LocalDateTime findCompletedPractice(long studentId, long attemptId) {
        var times = db.query("SELECT submitted_at FROM practice_attempt WHERE id=? AND user_id=? " +
            "AND status='COMPLETED' AND submitted_at IS NOT NULL",
            (rs, row) -> rs.getTimestamp(1).toLocalDateTime(), attemptId, studentId);
        return times.isEmpty() ? null : times.getFirst();
    }

    public long saveVocabularyExerciseAttempt(long studentId, long exerciseId, long lessonId,
            VocabularyMiniTestResponse.Result result, Map<String, String> answers, LocalDateTime submitted) {
        String answerData;
        try {
            answerData = json.writeValueAsString(Map.of("exerciseId", exerciseId, "answers", answers, "result", result));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể lưu kết quả exercise.", ex);
        }
        int attemptNo = db.queryForObject("""
            SELECT COALESCE(MAX(attempt_no),0)+1 FROM practice_attempt
            WHERE user_id=? AND lesson_id=? AND activity_type='LESSON_EXERCISE' AND skill='VOCABULARY'
            """, Integer.class, studentId, lessonId);
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO practice_attempt(user_id,activity_type,lesson_id,skill,attempt_no,status,
                    total_questions,correct_count,score,answers_data,started_at,submitted_at)
                VALUES (?,'LESSON_EXERCISE',?,'VOCABULARY',?,'COMPLETED',?,?,?,?,?,?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, studentId);
            statement.setLong(2, lessonId);
            statement.setInt(3, attemptNo);
            statement.setInt(4, result.totalQuestions());
            statement.setInt(5, result.correctCount());
            statement.setBigDecimal(6, result.score());
            statement.setString(7, answerData);
            statement.setObject(8, submitted);
            statement.setObject(9, submitted);
            return statement;
        }, key);
        return java.util.Objects.requireNonNull(key.getKey()).longValue();
    }
}
