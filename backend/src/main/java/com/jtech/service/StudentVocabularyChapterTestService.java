package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.StudentVocabularyChapterTestResponse;
import com.jtech.dto.response.StudentVocabularyExercise;
import com.jtech.entity.VocabularyTestQuestion;
import com.jtech.repository.VocabularyTestQuestionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.Principal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static com.jtech.dto.response.StudentVocabularyChapterTestResponse.*;

/** Student attempt lifecycle for published chapter vocabulary tests. */
@Service
public class StudentVocabularyChapterTestService {

    static final long SUBMIT_GRACE_SECONDS = 30;
    private static final ZoneId LEARNING_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String ATTEMPT_NOT_FOUND = "Không tìm thấy lượt làm bài.";
    private record QuestionSnapshot(
        Long id,
        String questionType,
        String content,
        List<String> options,
        String correctAnswer,
        Map<String, String> matches,
        String explanation
    ) {}

    private record Snapshot(
        String title,
        BigDecimal passingScore,
        int durationMinutes,
        List<QuestionSnapshot> questions,
        Map<String, String> answers
    ) {}

    private record AttemptRow(
        long id,
        long testId,
        long chapterId,
        long userId,
        int attemptNo,
        String status,
        String answersData,
        LocalDateTime startedAt,
        LocalDateTime deadlineAt,
        LocalDateTime submittedAt,
        BigDecimal score,
        int correctCount,
        int totalQuestions,
        Boolean passed,
        long timeSpentSec
    ) {}

    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final FeedbackService access;
    private final VocabularyChapterTestService chapterTests;
    private final VocabularyTestQuestionRepository questions;
    private final VocabularyExerciseService exercises;

    public StudentVocabularyChapterTestService(
        JdbcTemplate db,
        ObjectMapper json,
        FeedbackService access,
        VocabularyChapterTestService chapterTests,
        VocabularyTestQuestionRepository questions,
        VocabularyExerciseService exercises
    ) {
        this.db = db;
        this.json = json;
        this.access = access;
        this.chapterTests = chapterTests;
        this.questions = questions;
        this.exercises = exercises;
    }

    @Transactional
    public Test test(long chapterId, Principal principal) {
        var user = access.actor(principal, "STUDENT");
        StudentVocabularyExercise published = chapterTests.studentTest(chapterId);
        List<AttemptRow> rows = attempts(published.id(), user.getUserId());
        LocalDateTime currentTime = now();
        Long inProgressId = rows.stream()
            .filter(row -> "IN_PROGRESS".equals(row.status()) && currentTime.isBefore(row.deadlineAt()))
            .map(AttemptRow::id)
            .findFirst()
            .orElse(null);
        List<AttemptSummary> history = rows.stream()
            .filter(row -> !"IN_PROGRESS".equals(row.status()))
            .map(row -> new AttemptSummary(
                row.id(), row.attemptNo(), row.status(), row.score(), row.correctCount(),
                row.totalQuestions(), row.passed(), row.submittedAt()
            ))
            .toList();
        return new Test(
            published.id(), chapterId, published.title(), published.description(),
            published.durationMinutes(), published.passingScore(),
            published.questions().stream()
                .map(question -> new Question(question.id(), question.questionType().name(), question.content(), question.options()))
                .toList(),
            inProgressId, history
        );
    }

    @Transactional
    public Attempt start(long chapterId, Principal principal) {
        var user = access.actor(principal, "STUDENT");
        db.queryForObject("SELECT id FROM user_account WHERE id=? FOR UPDATE", Long.class, user.getUserId());
        StudentVocabularyExercise published = chapterTests.studentTest(chapterId);
        for (AttemptRow row : attempts(published.id(), user.getUserId())) {
            if (!"IN_PROGRESS".equals(row.status())) continue;
            if (now().isBefore(row.deadlineAt())) return view(row);
            finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED");
        }

        List<VocabularyTestQuestion> items = questions.findForTest(published.id());
        if (items.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài test chương chưa có câu hỏi.");
        List<QuestionSnapshot> snapshotQuestions = items.stream().map(question -> {
            var answer = exercises.readAnswer(question);
            return new QuestionSnapshot(
                question.getId(), question.getQuestionType().name(), question.getContent(),
                answer.options(), answer.correctAnswer(), answer.matches(), question.getExplanation()
            );
        }).toList();
        Snapshot snapshot = new Snapshot(
            published.title(), published.passingScore(), published.durationMinutes(),
            snapshotQuestions, Map.of()
        );
        LocalDateTime startedAt = now();
        Integer attemptNo = db.queryForObject(
            "SELECT COALESCE(MAX(attempt_no),0)+1 FROM test_attempt WHERE test_id=? AND user_id=?",
            Integer.class, published.id(), user.getUserId()
        );
        var key = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO test_attempt(test_id,user_id,attempt_no,total_questions,answers_data,started_at,deadline_at,status)
                VALUES (?,?,?,?,?,?,?,'IN_PROGRESS')
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, published.id());
            statement.setLong(2, user.getUserId());
            statement.setInt(3, attemptNo == null ? 1 : attemptNo);
            statement.setInt(4, snapshotQuestions.size());
            statement.setString(5, write(snapshot));
            statement.setObject(6, startedAt);
            statement.setObject(7, startedAt.plusMinutes(published.durationMinutes()));
            return statement;
        }, key);
        long attemptId = Objects.requireNonNull(key.getKey()).longValue();
        return view(owned(attemptId, chapterId, user.getUserId()));
    }

    @Transactional
    public Attempt attempt(long chapterId, long attemptId, Principal principal) {
        long userId = access.actor(principal, "STUDENT").getUserId();
        return view(expire(owned(attemptId, chapterId, userId)));
    }

    @Transactional
    public void saveAnswers(long chapterId, long attemptId, Map<String, String> answers, Principal principal) {
        long userId = access.actor(principal, "STUDENT").getUserId();
        AttemptRow row = expireForSave(owned(attemptId, chapterId, userId));
        if (!"IN_PROGRESS".equals(row.status())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Lượt làm đã nộp.");
        Snapshot snapshot = read(row.answersData());
        Map<String, String> merged = merge(snapshot, answers);
        db.update("UPDATE test_attempt SET answers_data=?,last_saved_at=? WHERE id=? AND status='IN_PROGRESS'",
            write(new Snapshot(snapshot.title(), snapshot.passingScore(), snapshot.durationMinutes(), snapshot.questions(), merged)),
            now(), attemptId);
    }

    @Transactional
    public Result submit(long chapterId, long attemptId, Map<String, String> answers, Principal principal) {
        long userId = access.actor(principal, "STUDENT").getUserId();
        AttemptRow row = owned(attemptId, chapterId, userId);
        if ("IN_PROGRESS".equals(row.status())) {
            Snapshot snapshot = read(row.answersData());
            LocalDateTime currentTime = now();
            boolean late = !currentTime.isBefore(row.deadlineAt().plusSeconds(SUBMIT_GRACE_SECONDS));
            Map<String, String> finalAnswers = late ? snapshot.answers() : merge(snapshot, answers);
            row = finish(row, finalAnswers, late ? "AUTO_SUBMITTED" : "SUBMITTED");
        }
        return resultView(row);
    }

    @Transactional
    public Result result(long chapterId, long attemptId, Principal principal) {
        long userId = access.actor(principal, "STUDENT").getUserId();
        AttemptRow row = owned(attemptId, chapterId, userId);
        if ("IN_PROGRESS".equals(row.status())) {
            if (now().isBefore(row.deadlineAt())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Lượt làm chưa nộp.");
            row = finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED");
        }
        return resultView(row);
    }

    private AttemptRow expireForSave(AttemptRow row) {
        if ("IN_PROGRESS".equals(row.status()) && !now().isBefore(row.deadlineAt().plusSeconds(SUBMIT_GRACE_SECONDS))) {
            return finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED");
        }
        return row;
    }

    private AttemptRow expire(AttemptRow row) {
        if ("IN_PROGRESS".equals(row.status()) && !now().isBefore(row.deadlineAt())) {
            return finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED");
        }
        return row;
    }

    private AttemptRow finish(AttemptRow row, Map<String, String> answers, String status) {
        Snapshot snapshot = read(row.answersData());
        Map<String, String> finalAnswers = answers == null ? Map.of() : answers;
        int correctCount = 0;
        for (QuestionSnapshot question : snapshot.questions()) {
            var key = new VocabularyExerciseService.AnswerData(question.options(), question.correctAnswer(), question.matches());
            if (exercises.matches(VocabularyTestQuestion.Type.valueOf(question.questionType()), key,
                finalAnswers.get(String.valueOf(question.id())))) correctCount++;
        }
        BigDecimal score = BigDecimal.valueOf(correctCount * 100L)
            .divide(BigDecimal.valueOf(snapshot.questions().size()), 2, RoundingMode.HALF_UP);
        LocalDateTime submittedAt = now();
        String answerData = write(new Snapshot(snapshot.title(), snapshot.passingScore(), snapshot.durationMinutes(),
            snapshot.questions(), finalAnswers));
        db.update("""
            UPDATE test_attempt
            SET status=?,answers_data=?,correct_count=?,score=?,is_passed=?,submitted_at=?,last_saved_at=?,
                time_spent_sec=GREATEST(0,TIMESTAMPDIFF(SECOND,started_at,LEAST(?,deadline_at)))
            WHERE id=? AND status='IN_PROGRESS'
            """, status, answerData, correctCount, score, score.compareTo(snapshot.passingScore()) >= 0,
            submittedAt, submittedAt, submittedAt, row.id());
        return owned(row.id(), row.chapterId(), row.userId());
    }

    private Map<String, String> merge(Snapshot snapshot, Map<String, String> supplied) {
        if (supplied == null) return snapshot.answers();
        Set<String> allowed = snapshot.questions().stream().map(q -> String.valueOf(q.id())).collect(Collectors.toSet());
        if (!allowed.containsAll(supplied.keySet())) throw new IllegalArgumentException("Câu trả lời không thuộc lượt làm này.");
        Map<String, String> merged = new LinkedHashMap<>(snapshot.answers());
        supplied.forEach((id, answer) -> {
            if (answer == null || answer.length() > 20000) merged.remove(id);
            else merged.put(id, answer);
        });
        return merged;
    }

    private Attempt view(AttemptRow row) {
        Snapshot snapshot = read(row.answersData());
        boolean inProgress = "IN_PROGRESS".equals(row.status());
        List<Question> visibleQuestions = inProgress ? snapshot.questions().stream().map(this::question).toList() : List.of();
        long remaining = inProgress ? Math.max(0, Duration.between(now(), row.deadlineAt()).getSeconds()) : 0;
        return new Attempt(row.id(), row.testId(), row.chapterId(), snapshot.title(), row.attemptNo(), row.status(),
            snapshot.durationMinutes(), snapshot.passingScore(), row.startedAt(), row.deadlineAt(), remaining,
            visibleQuestions, inProgress ? snapshot.answers() : Map.of());
    }

    private Result resultView(AttemptRow row) {
        Snapshot snapshot = read(row.answersData());
        List<QuestionResult> questionResults = snapshot.questions().stream().map(question -> {
            String yourAnswer = snapshot.answers().get(String.valueOf(question.id()));
            var key = new VocabularyExerciseService.AnswerData(question.options(), question.correctAnswer(), question.matches());
            boolean correct = exercises.matches(VocabularyTestQuestion.Type.valueOf(question.questionType()), key, yourAnswer);
            return new QuestionResult(question.id(), question.questionType(), question.content(), question.options(),
                yourAnswer, question.correctAnswer(), correct, question.explanation());
        }).toList();
        return new Result(row.id(), row.testId(), row.chapterId(), snapshot.title(), row.attemptNo(), row.status(),
            row.score(), row.correctCount(), row.totalQuestions(), snapshot.passingScore(),
            Boolean.TRUE.equals(row.passed()), row.timeSpentSec(), row.submittedAt(), questionResults);
    }

    private Question question(QuestionSnapshot question) {
        return new Question(question.id(), question.questionType(), question.content(), question.options());
    }

    private List<AttemptRow> attempts(long testId, long userId) {
        return db.query("""
            SELECT a.id,a.test_id,t.chapter_id,a.user_id,a.attempt_no,a.status,a.answers_data,a.started_at,a.deadline_at,
                   a.submitted_at,a.score,a.correct_count,a.total_questions,a.is_passed,a.time_spent_sec
            FROM test_attempt a JOIN test t ON t.id=a.test_id
            WHERE a.test_id=? AND a.user_id=? ORDER BY a.attempt_no DESC
            """, this::attemptRow, testId, userId);
    }

    private AttemptRow owned(long attemptId, long chapterId, long userId) {
        List<AttemptRow> rows = db.query("""
            SELECT a.id,a.test_id,t.chapter_id,a.user_id,a.attempt_no,a.status,a.answers_data,a.started_at,a.deadline_at,
                   a.submitted_at,a.score,a.correct_count,a.total_questions,a.is_passed,a.time_spent_sec
            FROM test_attempt a JOIN test t ON t.id=a.test_id
            WHERE a.id=? AND a.user_id=? AND t.chapter_id=? AND t.test_type='CHAPTER_TEST' AND t.skill='VOCABULARY'
            """, this::attemptRow, attemptId, userId, chapterId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, ATTEMPT_NOT_FOUND);
        return rows.getFirst();
    }

    private AttemptRow attemptRow(ResultSet rs, int rowNum) throws SQLException {
        return new AttemptRow(rs.getLong("id"), rs.getLong("test_id"), rs.getLong("chapter_id"), rs.getLong("user_id"),
            rs.getInt("attempt_no"), rs.getString("status"), rs.getString("answers_data"),
            rs.getTimestamp("started_at").toLocalDateTime(), rs.getTimestamp("deadline_at").toLocalDateTime(),
            rs.getTimestamp("submitted_at") == null ? null : rs.getTimestamp("submitted_at").toLocalDateTime(),
            rs.getBigDecimal("score"), rs.getInt("correct_count"), rs.getInt("total_questions"),
            (Boolean) rs.getObject("is_passed"), rs.getLong("time_spent_sec"));
    }

    private String write(Snapshot snapshot) {
        try {
            return json.writeValueAsString(snapshot);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Không thể lưu dữ liệu lượt làm bài.", failure);
        }
    }

    private Snapshot read(String data) {
        try {
            return json.readValue(data, Snapshot.class);
        } catch (JsonProcessingException failure) {
            throw new IllegalStateException("Dữ liệu lượt làm bài không hợp lệ.", failure);
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(LEARNING_ZONE);
    }
}
