package com.jtech.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserStreakRepository {
    private final JdbcTemplate db;
    public UserStreakRepository(JdbcTemplate db) { this.db = db; }

    public List<LocalDate> findLearningDays(long studentId) {
        return db.query("SELECT DISTINCT study_date FROM study_session WHERE user_id=? AND status='COMPLETED' AND is_qualified=TRUE AND completed_at IS NOT NULL ORDER BY study_date",
            (rs, row) -> rs.getDate(1).toLocalDate(), studentId);
    }

    // The account lock serializes completion and milestone updates for this student.
    public boolean hasQualifiedDay(long studentId, LocalDate day) {
        return Boolean.TRUE.equals(db.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM study_session WHERE user_id=? AND study_date=?
                AND status='COMPLETED' AND is_qualified=TRUE AND completed_at IS NOT NULL)
            """, Boolean.class, studentId, day));
    }

    public List<Map<String, Object>> findStudentsWithoutLearningToday(LocalDate day) {
        return db.queryForList("""
            SELECT u.id AS user_id, u.email, u.full_name
            FROM user_account u
            JOIN role r ON r.id = u.role_id
            WHERE u.status='ACTIVE' AND r.code='STUDENT'
                AND u.reminder_enabled=TRUE AND u.reminder_time <= CURRENT_TIME()
                AND NOT EXISTS (
                    SELECT 1 FROM study_session s WHERE s.user_id=u.id AND s.study_date=?
                        AND s.status='COMPLETED' AND s.is_qualified=TRUE AND s.completed_at IS NOT NULL
                )
                AND NOT EXISTS (
                    SELECT 1 FROM learning_reminder_sent sent
                    WHERE sent.user_id=u.id AND sent.reminder_date=?
                )
            """, day, day);
    }

    public boolean markLearningReminderSent(long studentId, LocalDate day) {
        return db.update("INSERT IGNORE INTO learning_reminder_sent(user_id,reminder_date) VALUES(?,?)",
            studentId, day) == 1;
    }

    public void saveCompletedSession(long studentId, String type, String referenceColumn,
            long referenceId, LocalDateTime time) {
        String key = type + ":" + referenceId + ":" + time.toLocalDate();
        db.update("""
            INSERT INTO study_session(user_id,activity_key,activity_type,%s,study_date,
                started_at,ended_at,completed_at,is_qualified,status)
            VALUES (?,?,?,?,?,?,?,?,TRUE,'COMPLETED')
            ON DUPLICATE KEY UPDATE activity_key=activity_key
            """.formatted(referenceColumn), studentId, key, type, referenceId,
            time.toLocalDate(), time, time, time);
    }

    public void saveCompletedStandaloneSession(long studentId, String type, String activityKey, LocalDateTime time) {
        String key = type + ":" + activityKey + ":" + time.toLocalDate();
        db.update("""
            INSERT INTO study_session(user_id,activity_key,activity_type,section_type,study_date,
                started_at,ended_at,completed_at,is_qualified,status)
            VALUES (?,?,?, ?,?,?,?,?,TRUE,'COMPLETED')
            ON DUPLICATE KEY UPDATE activity_key=activity_key
            """, studentId, key, type, type, time.toLocalDate(), time, time, time);
    }

    public void updateStreak(long studentId, int current, int longest, LocalDate studyDate) {
        db.update("""
            UPDATE user_account
            SET current_streak=?, longest_streak=GREATEST(longest_streak,?),
                last_study_date=GREATEST(COALESCE(last_study_date,?),?)
            WHERE id=?
            """, current, longest, studyDate, studyDate, studentId);
    }

    public int findLongest(long studentId) {
        return db.queryForObject("SELECT longest_streak FROM user_account WHERE id=?", Integer.class, studentId);
    }
}
