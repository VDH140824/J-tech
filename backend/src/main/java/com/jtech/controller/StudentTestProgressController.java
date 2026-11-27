package com.jtech.controller;

import com.jtech.service.StreakService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Trang chủ học viên: trạng thái Mini test và Test chương đã xuất bản của một khóa học
 * (đã làm chưa, đã đạt chưa). Chỉ đọc bảng test / test_attempt, không thêm bảng.
 */
@RestController
@RequestMapping("/student/progress")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentTestProgressController {

    /**
     * testType: MINI_TEST | CHAPTER_TEST; lessonId null với Mini test theo chương (Kanji) và Test chương.
     * attempted: đã nộp ít nhất 1 lần; passed: có lần nộp đạt.
     */
    public record TestStatus(long id, String testType, Long lessonId, long chapterId, String skill,
                             boolean attempted, boolean passed) {
    }

    private final JdbcTemplate jdbc;

    public StudentTestProgressController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/tests")
    @Transactional(readOnly = true)
    public List<TestStatus> tests(@RequestParam Long courseId, Principal principal) {
        return jdbc.query("""
                SELECT t.id, t.test_type, t.lesson_id, ch.id AS chapter_id, t.skill,
                  EXISTS(SELECT 1 FROM test_attempt a JOIN user_account u ON u.id = a.user_id
                    WHERE u.email = ? AND a.test_id = t.id AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')) AS attempted,
                  EXISTS(SELECT 1 FROM test_attempt a JOIN user_account u ON u.id = a.user_id
                    WHERE u.email = ? AND a.test_id = t.id AND a.is_passed = TRUE) AS passed
                FROM test t
                LEFT JOIN lesson l ON l.id = t.lesson_id
                JOIN chapter ch ON ch.id = COALESCE(l.chapter_id, t.chapter_id)
                JOIN course c ON c.id = ch.course_id
                WHERE c.id = ? AND t.status = 'PUBLISHED' AND t.test_type IN ('MINI_TEST', 'CHAPTER_TEST')
                  -- Bài tập Từ vựng được lưu là test MINI_TEST + skill VOCABULARY (VocabularyTest.Type.EXERCISE): không phải Mini test
                  AND NOT (t.test_type = 'MINI_TEST' AND t.skill = 'VOCABULARY')
                  AND ch.status = 'PUBLISHED' AND (l.id IS NULL OR l.status = 'PUBLISHED')
                  AND c.status = 'PUBLISHED' AND c.deleted_at IS NULL
                ORDER BY ch.display_order, ch.chapter_no, t.id
                """, (rs, row) -> new TestStatus(rs.getLong("id"), rs.getString("test_type"),
                rs.getObject("lesson_id") == null ? null : rs.getLong("lesson_id"), rs.getLong("chapter_id"),
                rs.getString("skill"), rs.getBoolean("attempted"), rs.getBoolean("passed")),
                principal.getName(), principal.getName(), courseId);
    }

    /**
     * Một dòng của trang "Kết quả bài kiểm tra": thông tin test, chương/bài chứa test và kết quả của học viên.
     * attempts: số lần đã nộp; bestScore / lastSubmittedAt null khi chưa nộp lần nào.
     */
    public record TestResult(long id, String testType, String skill, String title, BigDecimal passingScore,
                             int durationMinutes, long chapterId, int chapterNo, String chapterTitle,
                             Long lessonId, Integer lessonNo, String lessonTitle, String lessonSkill,
                             int attempts, BigDecimal bestScore, boolean passed, LocalDateTime lastSubmittedAt) {
    }

    @GetMapping("/tests/results")
    @Transactional(readOnly = true)
    public List<TestResult> results(@RequestParam Long courseId, Principal principal) {
        return jdbc.query("""
                SELECT t.id, t.test_type, t.skill, t.title, t.passing_score, t.duration_minutes,
                  ch.id AS chapter_id, ch.chapter_no, ch.title AS chapter_title,
                  l.id AS lesson_id, l.lesson_no, l.title AS lesson_title, l.skill_type AS lesson_skill,
                  COUNT(a.id) AS attempts, MAX(a.score) AS best_score,
                  COALESCE(MAX(a.is_passed = TRUE), 0) AS passed, MAX(a.submitted_at) AS last_submitted_at
                FROM test t
                LEFT JOIN lesson l ON l.id = t.lesson_id
                JOIN chapter ch ON ch.id = COALESCE(l.chapter_id, t.chapter_id)
                JOIN course c ON c.id = ch.course_id
                LEFT JOIN test_attempt a ON a.test_id = t.id
                  AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
                  AND a.user_id = (SELECT u.id FROM user_account u WHERE u.email = ?)
                WHERE c.id = ? AND t.status = 'PUBLISHED' AND t.test_type IN ('MINI_TEST', 'CHAPTER_TEST')
                  -- Bài tập Từ vựng được lưu là test MINI_TEST + skill VOCABULARY (VocabularyTest.Type.EXERCISE): không phải Mini test
                  AND NOT (t.test_type = 'MINI_TEST' AND t.skill = 'VOCABULARY')
                  AND ch.status = 'PUBLISHED' AND (l.id IS NULL OR l.status = 'PUBLISHED')
                  AND c.status = 'PUBLISHED' AND c.deleted_at IS NULL
                GROUP BY t.id, t.test_type, t.skill, t.title, t.passing_score, t.duration_minutes,
                  ch.id, ch.chapter_no, ch.title, ch.display_order, l.id, l.lesson_no, l.title, l.skill_type
                ORDER BY ch.display_order, ch.chapter_no, t.test_type DESC, l.lesson_no, t.id
                """, (rs, row) -> new TestResult(rs.getLong("id"), rs.getString("test_type"), rs.getString("skill"),
                rs.getString("title"), rs.getBigDecimal("passing_score"), rs.getInt("duration_minutes"),
                rs.getLong("chapter_id"), rs.getInt("chapter_no"), rs.getString("chapter_title"),
                rs.getObject("lesson_id") == null ? null : rs.getLong("lesson_id"),
                rs.getObject("lesson_no") == null ? null : rs.getInt("lesson_no"),
                rs.getString("lesson_title"), rs.getString("lesson_skill"),
                rs.getInt("attempts"), rs.getBigDecimal("best_score"), rs.getBoolean("passed"),
                rs.getObject("last_submitted_at", LocalDateTime.class)),
                principal.getName(), courseId);
    }

    /** Bài học người học hoạt động gần nhất (null nếu chưa học gì). */
    public record LastLesson(long lessonId, long chapterId, long courseId, LocalDateTime at) {
    }

    /**
     * Trang chủ "Tiếp tục học": lấy bài học có hoạt động gần nhất của học viên từ các bảng đã có
     * (ngày học theo mục từ vựng/Kanji/ngữ pháp, lượt luyện tập, lượt làm test theo bài, phiên đọc hiểu,
     * tiến độ phần học). Chỉ tính bài/chương/khóa còn xuất bản.
     */
    @GetMapping("/last-lesson")
    @Transactional(readOnly = true)
    public LastLesson lastLesson(Principal principal) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM user_account WHERE email = ?", Long.class, principal.getName());
        if (ids.isEmpty()) return null;
        long userId = ids.get(0);
        List<LastLesson> rows = jdbc.query("""
                SELECT x.lesson_id, ch.id AS chapter_id, c.id AS course_id, x.at
                FROM (
                  SELECT v.lesson_id, s.completed_at AS at FROM study_session s
                    JOIN vocabulary v ON v.id = s.vocabulary_id WHERE s.user_id = ?
                  UNION ALL
                  SELECT k.lesson_id, s.completed_at FROM study_session s
                    JOIN kanji k ON k.id = s.kanji_id WHERE s.user_id = ?
                  UNION ALL
                  SELECT g.lesson_id, s.completed_at FROM study_session s
                    JOIN grammar g ON g.id = s.grammar_id WHERE s.user_id = ?
                  UNION ALL
                  SELECT p.lesson_id, COALESCE(p.submitted_at, p.last_saved_at, p.started_at) FROM practice_attempt p
                    WHERE p.user_id = ? AND p.lesson_id IS NOT NULL
                  UNION ALL
                  SELECT t.lesson_id, COALESCE(a.submitted_at, a.last_saved_at, a.started_at) FROM test_attempt a
                    JOIN test t ON t.id = a.test_id WHERE a.user_id = ? AND t.lesson_id IS NOT NULL
                  UNION ALL
                  SELECT r.lesson_id, COALESCE(r.ended_at, r.started_at) FROM reading_session r
                    WHERE r.user_id = ? AND r.lesson_id IS NOT NULL
                  UNION ALL
                  SELECT lp.lesson_id, COALESCE(lp.updated_at, lp.completed_at, lp.exercise_completed_at,
                      lp.video_completed_at, lp.document_viewed_at)
                    FROM lesson_section_progress lp WHERE lp.user_id = ?
                ) x
                JOIN lesson l ON l.id = x.lesson_id
                JOIN chapter ch ON ch.id = l.chapter_id
                JOIN course c ON c.id = ch.course_id
                WHERE x.at IS NOT NULL AND l.status = 'PUBLISHED' AND ch.status = 'PUBLISHED'
                  AND c.status = 'PUBLISHED' AND c.deleted_at IS NULL
                ORDER BY x.at DESC
                LIMIT 1
                """, (rs, row) -> new LastLesson(rs.getLong("lesson_id"), rs.getLong("chapter_id"),
                rs.getLong("course_id"), rs.getObject("at", LocalDateTime.class)),
                userId, userId, userId, userId, userId, userId, userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    /** Bài học vừa mở: lessonId, hoặc (chapterId + skill + lessonNo) khi trang chương dùng số bài. */
    public record ViewedLesson(Long lessonId, Long chapterId, String skill, Integer lessonNo) {
    }

    /**
     * Ghi nhận học viên vừa mở một bài học (chỉ để biết "lần học cuối"): cập nhật document_viewed_at (lần đầu)
     * và updated_at của lesson_section_progress. Không đụng completed_at nên không ảnh hưởng tiến độ hoàn thành.
     */
    @PostMapping("/viewed")
    @Transactional
    public ResponseEntity<Void> viewed(@RequestBody ViewedLesson body, Principal principal) {
        List<Long> users = jdbc.queryForList("SELECT id FROM user_account WHERE email = ?", Long.class, principal.getName());
        if (users.isEmpty() || body == null) return ResponseEntity.noContent().build();
        String published = """
                SELECT l.id, l.skill_type FROM lesson l JOIN chapter ch ON ch.id = l.chapter_id
                JOIN course c ON c.id = ch.course_id
                WHERE l.status = 'PUBLISHED' AND ch.status = 'PUBLISHED' AND c.status = 'PUBLISHED'
                  AND c.deleted_at IS NULL
                  AND l.skill_type IN ('VOCABULARY', 'KANJI', 'GRAMMAR', 'LISTENING', 'READING')
                """;
        record Found(long id, String skill) {
        }
        List<Found> found;
        if (body.lessonId() != null) {
            found = jdbc.query(published + " AND l.id = ?",
                    (rs, row) -> new Found(rs.getLong(1), rs.getString(2)), body.lessonId());
        } else if (body.chapterId() != null && body.skill() != null && body.lessonNo() != null) {
            found = jdbc.query(published + " AND l.chapter_id = ? AND l.skill_type = ? AND l.lesson_no = ?"
                            + " ORDER BY l.display_order, l.id LIMIT 1",
                    (rs, row) -> new Found(rs.getLong(1), rs.getString(2)),
                    body.chapterId(), body.skill(), body.lessonNo());
        } else {
            found = List.of();
        }
        if (found.isEmpty()) return ResponseEntity.noContent().build();
        // Cùng múi giờ với các bảng hoạt động khác (study_session…) để so "gần nhất" cho đúng.
        LocalDateTime now = LocalDateTime.now(StreakService.LEARNING_ZONE);
        jdbc.update("""
                INSERT INTO lesson_section_progress (user_id, lesson_id, section_type, document_viewed_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  document_viewed_at = COALESCE(document_viewed_at, VALUES(document_viewed_at)),
                  updated_at = VALUES(updated_at)
                """, users.get(0), found.get(0).id(), found.get(0).skill(), now, now);
        return ResponseEntity.noContent().build();
    }
}
