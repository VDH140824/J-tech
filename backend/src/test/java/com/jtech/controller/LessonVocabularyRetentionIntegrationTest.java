package com.jtech.controller;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.sql.*;
import static org.junit.jupiter.api.Assertions.*;

// Opt-in MySQL regression tests. All fixture changes are rolled back.
@EnabledIfEnvironmentVariable(named = "JTECH_MYSQL_TEST_URL", matches = ".+")
class LessonVocabularyRetentionIntegrationTest {
    private Connection connection;
    private long chapterId;

    @BeforeEach void begin() throws SQLException {
        connection = DriverManager.getConnection(System.getenv("JTECH_MYSQL_TEST_URL"),
                System.getenv("JTECH_MYSQL_TEST_USER"), System.getenv("JTECH_MYSQL_TEST_PASSWORD"));
        connection.setAutoCommit(false);
        try (var query = connection.createStatement(); var row = query.executeQuery("SELECT id FROM chapter ORDER BY id LIMIT 1")) {
            assertTrue(row.next(), "Test database needs a chapter");
            chapterId = row.getLong(1);
        }
    }

    @AfterEach void rollback() throws SQLException {
        if (connection != null) {
            try { connection.rollback(); } finally { connection.close(); }
        }
    }

    private long insert(String sql, Object... values) throws SQLException {
        try (var query = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            for (int index = 0; index < values.length; index++) query.setObject(index + 1, values[index]);
            query.executeUpdate();
            try (var keys = query.getGeneratedKeys()) { assertTrue(keys.next()); return keys.getLong(1); }
        }
    }

    private long lesson() throws SQLException {
        return insert("INSERT INTO lesson(chapter_id,skill_type,lesson_no,title,display_order,status) VALUES (?,'VOCABULARY',999,'Retention regression fixture',999,'PUBLISHED')", chapterId);
    }

    private long word(long lessonId) throws SQLException {
        return insert("INSERT INTO vocabulary(lesson_id,word,reading,meaning_vi,audio_url,status) VALUES (?,'retained-word','reading','meaning','https://example.com/audio.mp3','PUBLISHED')", lessonId);
    }

    private void execute(String sql, long id) throws SQLException {
        try (var query = connection.prepareStatement(sql)) { query.setLong(1, id); query.executeUpdate(); }
    }

    private void assertWord(long id, Long lessonId) throws SQLException {
        try (var query = connection.prepareStatement("SELECT lesson_id,word,reading,meaning_vi,audio_url,status FROM vocabulary WHERE id=?")) {
            query.setLong(1, id);
            try (var row = query.executeQuery()) {
                assertTrue(row.next(), "Vocabulary must survive lesson deletion");
                assertEquals(lessonId, row.getObject("lesson_id") == null ? null : Long.valueOf(row.getLong("lesson_id")));
                assertEquals("retained-word", row.getString("word"));
                assertEquals("reading", row.getString("reading"));
                assertEquals("meaning", row.getString("meaning_vi"));
                assertEquals("https://example.com/audio.mp3", row.getString("audio_url"));
                assertEquals("PUBLISHED", row.getString("status"));
            }
        }
    }

    @Test void deletingLessonOnlyUnassignsWordsAndAllowsReassignment() throws SQLException {
        long source = lesson(), target = lesson(), vocabulary = word(source);
        execute("DELETE FROM lesson WHERE id=?", source);
        assertWord(vocabulary, null);
        try (var query = connection.prepareStatement("UPDATE vocabulary SET lesson_id=? WHERE id=?")) {
            query.setLong(1, target); query.setLong(2, vocabulary); query.executeUpdate();
        }
        assertWord(vocabulary, target);
    }

    @Test void hidingLessonKeepsWordsAndTheirAssignment() throws SQLException {
        long lessonId = lesson(), vocabulary = word(lessonId);
        execute("UPDATE lesson SET status='HIDDEN' WHERE id=?", lessonId);
        assertWord(vocabulary, lessonId);
    }

    @Test void anotherForeignKeyBlockingDeletionDoesNotUnassignWords() throws SQLException {
        long lessonId = lesson(), vocabulary = word(lessonId);
        insert("INSERT INTO grammar(lesson_id,structure_name,meaning_vi,usage_explanation,example_jp,example_vi) VALUES (?,'fixture','meaning','usage','example','translation')", lessonId);
        assertThrows(SQLException.class, () -> execute("DELETE FROM lesson WHERE id=?", lessonId));
        assertWord(vocabulary, lessonId);
    }
}
