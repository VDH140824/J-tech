package com.jtech.service;

import com.jtech.service.VocabularyChapterService.Flashcard;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentVocabularyFlashcardService {

    public record StudentFlashcard(
        Long id,
        Long lessonId,
        int lessonNo,
        String lessonTitle,
        String word,
        String reading,
        String meaningVi,
        String exampleJp,
        String exampleVi,
        boolean remembered
    ) {}

    private final JdbcTemplate db;
    private final FeedbackService access;
    private final VocabularyChapterService vocabulary;

    public StudentVocabularyFlashcardService(
        JdbcTemplate db,
        FeedbackService access,
        VocabularyChapterService vocabulary
    ) {
        this.db = db;
        this.access = access;
        this.vocabulary = vocabulary;
    }

    @Transactional(readOnly = true)
    public List<StudentFlashcard> studentFlashcards(Long chapterId, Principal principal) {
        long userId = access.actor(principal, "STUDENT").getUserId();
        List<Flashcard> cards = vocabulary.studentFlashcards(chapterId);
        if (cards.isEmpty()) return List.of();

        String placeholders = String.join(",", java.util.Collections.nCopies(cards.size(), "?"));
        Object[] parameters = new Object[cards.size() + 1];
        parameters[0] = userId;
        for (int i = 0; i < cards.size(); i++) parameters[i + 1] = cards.get(i).id();

        Map<Long, Boolean> rememberedById = new HashMap<>();
        db.query(
            "SELECT vocabulary_id, flip_status='REMEMBERED' AS remembered " +
            "FROM flashcard_progress WHERE user_id=? AND vocabulary_id IN (" + placeholders + ")",
            (RowCallbackHandler) rs -> rememberedById.put(
                rs.getLong("vocabulary_id"),
                rs.getBoolean("remembered")
            ),
            parameters
        );

        return cards.stream()
            .map(card -> new StudentFlashcard(
                card.id(),
                card.lessonId(),
                card.lessonNo(),
                card.lessonTitle(),
                card.word(),
                card.reading(),
                card.meaningVi(),
                card.exampleJp(),
                card.exampleVi(),
                rememberedById.getOrDefault(card.id(), false)
            ))
            .toList();
    }

    @Transactional
    public void remember(Long chapterId, Long vocabularyId, boolean remembered, Principal principal) {
        long userId = access.actor(principal, "STUDENT").getUserId();
        Integer matchingCards = db.queryForObject(
            "SELECT COUNT(*) FROM vocabulary v " +
            "JOIN lesson l ON l.id=v.lesson_id " +
            "JOIN chapter ch ON ch.id=l.chapter_id " +
            "JOIN course c ON c.id=ch.course_id " +
            "WHERE v.id=? AND ch.id=? AND l.skill_type='VOCABULARY' " +
            "AND v.status='PUBLISHED' AND l.status='PUBLISHED' " +
            "AND ch.status='PUBLISHED' AND c.status='PUBLISHED' AND c.deleted_at IS NULL",
            Integer.class,
            vocabularyId,
            chapterId
        );
        if (matchingCards == null || matchingCards == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Từ vựng không thuộc chương này.");
        }

        db.update(
            "INSERT INTO flashcard_progress(user_id, vocabulary_id, flip_status, last_reviewed_at) " +
            "VALUES (?, ?, ?, CURRENT_TIMESTAMP) " +
            "ON DUPLICATE KEY UPDATE flip_status=VALUES(flip_status), " +
            "last_reviewed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP",
            userId,
            vocabularyId,
            remembered ? "REMEMBERED" : "NOT_REMEMBERED"
        );
    }
}
