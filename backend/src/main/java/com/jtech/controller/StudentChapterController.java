package com.jtech.controller;

import com.jtech.dto.response.StudentChapterList;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/student/courses")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentChapterController {
    private final JdbcTemplate jdbc;

    public StudentChapterController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/{courseId}/chapters")
    @Transactional(readOnly = true)
    public StudentChapterList chapters(@PathVariable Long courseId, Principal principal) {
        var courses = jdbc.query("SELECT id, name, description FROM course WHERE id = ? AND status = 'PUBLISHED' AND deleted_at IS NULL",
                (rs, row) -> new StudentChapterList(rs.getLong("id"), rs.getString("name"),
                        rs.getString("description"), List.of()), courseId);
        if (courses.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Course not found");
        var lessons = jdbc.query("""
                SELECT l.id, l.chapter_id, l.lesson_no, l.title, l.skill_type,
                  (SELECT COUNT(*) FROM grammar g WHERE g.lesson_id=l.id AND g.status='PUBLISHED') +
                  (SELECT COUNT(*) FROM kanji k WHERE k.lesson_id=l.id AND k.status='PUBLISHED') +
                  (SELECT COUNT(*) FROM vocabulary v WHERE v.lesson_id=l.id AND v.status='PUBLISHED') AS item_count,
                  (SELECT COUNT(*) FROM grammar g WHERE g.lesson_id=l.id AND g.status='PUBLISHED'
                    AND g.video_url IS NOT NULL AND g.video_url <> '') AS video_count,
                  (SELECT COALESCE(SUM(g.video_duration_sec),0) FROM grammar g WHERE g.lesson_id=l.id
                    AND g.status='PUBLISHED' AND g.video_url IS NOT NULL AND g.video_url <> '') AS duration_seconds,
                  (SELECT COUNT(*) FROM question q WHERE q.lesson_id=l.id AND q.status='ACTIVE'
                    AND q.is_exercise_question=TRUE) AS exercise_count,
                  (SELECT COUNT(*) FROM test t WHERE t.lesson_id=l.id AND t.status='PUBLISHED') AS test_count,
                  EXISTS(SELECT 1 FROM lesson_section_progress p JOIN user_account u ON u.id=p.user_id
                    WHERE u.email=? AND p.lesson_id=l.id AND p.section_type=l.skill_type
                    AND p.completed_at IS NOT NULL) AS completed
                FROM lesson l JOIN chapter c ON c.id=l.chapter_id
                WHERE c.course_id=? AND c.status='PUBLISHED' AND l.status='PUBLISHED'
                ORDER BY l.display_order, l.lesson_no, l.id
                """, (rs, row) -> new ChapterLesson(rs.getLong("chapter_id"), new StudentChapterList.Lesson(
                rs.getLong("id"), rs.getInt("lesson_no"), rs.getString("title"), rs.getString("skill_type"),
                rs.getInt("item_count"), rs.getInt("video_count"), rs.getLong("duration_seconds"),
                rs.getInt("exercise_count"), rs.getInt("test_count"), rs.getBoolean("completed"))), principal.getName(), courseId);
        var chapters = jdbc.query("""
                SELECT c.id, c.chapter_no, c.title, c.description,
                  (SELECT COUNT(*) FROM test t WHERE t.chapter_id=c.id AND t.lesson_id IS NULL
                    AND t.status='PUBLISHED') AS test_count
                FROM chapter c WHERE c.course_id=? AND c.status='PUBLISHED'
                ORDER BY c.display_order, c.chapter_no, c.id
                """, (rs, row) -> {
                long chapterId = rs.getLong("id");
                return new StudentChapterList.Chapter(chapterId, rs.getInt("chapter_no"),
                rs.getString("title"), rs.getString("description"), rs.getInt("test_count"),
                lessons.stream().filter(l -> l.chapterId() == chapterId).map(ChapterLesson::lesson).toList());
                }, courseId);
        var course = courses.getFirst();
        return new StudentChapterList(course.id(), course.name(), course.description(), chapters);
    }

    private record ChapterLesson(long chapterId, StudentChapterList.Lesson lesson) {}
}
