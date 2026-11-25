package com.jtech.repository;

import com.jtech.service.StreakService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Ghi tiến độ phần học Từ vựng / Kanji vào lesson_section_progress khi học viên nộp bài tập của bài
 * (màn Tiến độ học tập và Trang chủ đọc cột completed_at). Không thêm bảng; dòng đã hoàn thành thì giữ nguyên
 * thời điểm hoàn thành đầu tiên, điểm tốt nhất luôn được cập nhật.
 */
@Repository
public class LessonSectionProgressRepository {

    private static final Set<String> SECTION_TYPES = Set.of("VOCABULARY", "KANJI");

    private final JdbcTemplate db;

    public LessonSectionProgressRepository(JdbcTemplate db) {
        this.db = db;
    }

    /** Điểm thang 100 từ số câu đúng / tổng số câu. */
    public static BigDecimal score(int correct, int total) {
        if (total <= 0) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(correct * 100L).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    /** Đánh dấu phần học của bài đã hoàn thành (theo id học viên). */
    public void markExerciseCompleted(long userId, long lessonId, String sectionType, BigDecimal score) {
        if (!SECTION_TYPES.contains(sectionType)) throw new IllegalArgumentException("section_type không hợp lệ: " + sectionType);
        Timestamp now = Timestamp.valueOf(LocalDateTime.now(StreakService.LEARNING_ZONE));
        db.update("""
                INSERT INTO lesson_section_progress
                  (user_id, lesson_id, section_type, exercise_completed_at, completed_at, best_exercise_score, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  exercise_completed_at = COALESCE(exercise_completed_at, VALUES(exercise_completed_at)),
                  completed_at = COALESCE(completed_at, VALUES(completed_at)),
                  best_exercise_score = GREATEST(COALESCE(best_exercise_score, 0), COALESCE(VALUES(best_exercise_score), 0)),
                  updated_at = VALUES(updated_at)
                """, userId, lessonId, sectionType, now, now, score, now);
    }

    /** Như trên, tìm học viên theo email đăng nhập (Principal.getName()). */
    public void markExerciseCompleted(String email, long lessonId, String sectionType, BigDecimal score) {
        List<Long> ids = db.queryForList("SELECT id FROM user_account WHERE email = ?", Long.class, email);
        if (!ids.isEmpty()) markExerciseCompleted(ids.get(0), lessonId, sectionType, score);
    }
}
