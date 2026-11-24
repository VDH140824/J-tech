package com.jtech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.Question;
import jakarta.persistence.EntityManager;
import java.net.URI;
import java.security.Principal;
import java.text.Normalizer;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentKanjiExerciseService {
    private final JdbcTemplate db;
    private final EntityManager em;
    private final FeedbackService access;
    private final ObjectMapper mapper;

    public record ExerciseQuestion(long id, Question.QuestionType questionType, String content,
        List<String> options, List<String> leftItems, List<String> rightItems) {}
    public record Answer(String value, Map<String, String> matches) {}
    public record Review(long id, boolean correct, String correctAnswer, Map<String, String> matches, String explanation) {}
    public record Result(int correctCount, int total, List<Review> questions) {}

    private boolean requireDocument(Principal p, long lessonId) {
        access.actor(p, "STUDENT");
        var documents = db.queryForList("""
            SELECT l.documents FROM lesson l JOIN chapter ch ON ch.id=l.chapter_id
            JOIN course c ON c.id=ch.course_id WHERE l.id=? AND l.skill_type='KANJI'
            AND l.status='PUBLISHED' AND ch.status='PUBLISHED' AND c.status='PUBLISHED'
            AND c.deleted_at IS NULL
            """, String.class, lessonId);
        if (documents.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu Kanji đã xuất bản.");
        // Old lessons may contain several documents with unassigned questions. Never mix those exercises.
        String raw = documents.getFirst();
        if (raw == null || raw.isBlank()) return false;
        try {
            JsonNode root;
            try { root = mapper.readTree(raw); } catch (Exception ignored) { root = mapper.getNodeFactory().textNode(raw); }
            var entries = root.isArray() ? root : mapper.createArrayNode().add(root);
            var urls = new HashSet<String>();
            for (var entry : entries) {
                String url = entry.isTextual() ? entry.asText().trim() : entry.path("url").asText().trim();
                try {
                    URI uri = URI.create(url);
                    if (Set.of("http", "https").contains(Objects.toString(uri.getScheme(), "")) && uri.getHost() != null && uri.getUserInfo() == null) urls.add(url);
                } catch (IllegalArgumentException ignored) {}
            }
            return urls.size() == 1;
        } catch (Exception e) { return false; }
    }

    private List<Question> bank(long lessonId) {
        return em.createQuery("SELECT q FROM Question q WHERE q.lessonId=:lesson AND q.skill=:skill AND q.isExerciseQuestion=true AND q.status=:status ORDER BY q.displayOrder,q.id", Question.class)
            .setParameter("lesson", lessonId).setParameter("skill", Question.Skill.KANJI)
            .setParameter("status", Question.QuestionStatus.ACTIVE).getResultList();
    }

    private KanjiExerciseService.AnswerData answer(Question q) {
        try { return mapper.readValue(q.getAnswerData(), KanjiExerciseService.AnswerData.class); }
        catch (Exception e) { throw new IllegalStateException("Dữ liệu đáp án Kanji không hợp lệ.", e); }
    }

    public List<ExerciseQuestion> questions(Principal p, long lessonId) {
        if (!requireDocument(p, lessonId)) return List.of();
        return bank(lessonId).stream().map(q -> {
            var a = answer(q);
            var left = new ArrayList<>(a.matches().keySet());
            var right = new ArrayList<>(a.matches().values());
            Collections.shuffle(right);
            return new ExerciseQuestion(q.getId(), q.getQuestionType(), q.getContent(), a.options(), left, right);
        }).toList();
    }

    public Result submit(Principal p, long lessonId, List<Long> questionIds, Map<Long, Answer> answers) {
        if (!requireDocument(p, lessonId)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Tài liệu chưa có bộ bài tập riêng.");
        var questions = bank(lessonId);
        var expected = questions.stream().map(Question::getId).collect(java.util.stream.Collectors.toSet());
        if (questionIds == null || questionIds.isEmpty() || new HashSet<>(questionIds).size() != questionIds.size()
            || !expected.equals(new HashSet<>(questionIds)) || answers == null || !expected.containsAll(answers.keySet()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bộ câu hỏi đã thay đổi hoặc không thuộc tài liệu. Vui lòng tải lại bài tập.");
        var reviews = questions.stream().map(q -> {
            var correct = answer(q);
            var given = answers.get(q.getId());
            boolean ok = given != null && (q.getQuestionType() == Question.QuestionType.MATCHING
                ? given.matches() != null && given.matches().size() == correct.matches().size()
                    && correct.matches().entrySet().stream().allMatch(pair -> normalize(pair.getValue()).equals(normalize(given.matches().get(pair.getKey()))))
                : !normalize(given.value()).isEmpty() && normalize(given.value()).equals(normalize(correct.correctAnswer())));
            return new Review(q.getId(), ok, correct.correctAnswer(), correct.matches(), q.getExplanation());
        }).toList();
        return new Result((int) reviews.stream().filter(Review::correct).count(), reviews.size(), reviews);
    }

    private String normalize(String value) {
        return Normalizer.normalize(Objects.toString(value, "").trim(), Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
    }
}
