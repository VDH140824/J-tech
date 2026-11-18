package com.jtech.repository;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CampusQuizQuestionRepository {
    public record Candidate(long id, String content, String mediaUrl, String answerData, String explanation) {}

    private final JdbcTemplate db;

    public CampusQuizQuestionRepository(JdbcTemplate db) {
        this.db = db;
    }

    public List<Candidate> findEligibleQuestionsByCourseId(long courseId) {
        return db.query("""
            SELECT q.id, q.content, q.media_url, q.answer_data, q.explanation
            FROM (
                SELECT DISTINCT tq.question_id
                FROM chapter ch
                JOIN test t ON t.chapter_id = ch.id
                JOIN test_question tq ON tq.test_id = t.id
                WHERE ch.course_id = ? AND ch.status = 'PUBLISHED'
                  AND t.status = 'PUBLISHED' AND t.test_type = 'CHAPTER_TEST'
            ) eligible
            JOIN question q ON q.id = eligible.question_id
            WHERE q.status = 'ACTIVE' AND q.question_type = 'MCQ'
            """,
            (rs, row) -> new Candidate(rs.getLong("id"), rs.getString("content"), rs.getString("media_url"),
                rs.getString("answer_data"), rs.getString("explanation")),
            courseId);
    }
}
