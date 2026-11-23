package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.StudentGrammarResponse;
import com.jtech.entity.User;
import com.jtech.repository.StudentGrammarQueryRepository;
import com.jtech.repository.StudentGrammarQueryRepository.AttemptRow;
import com.jtech.repository.StudentGrammarQueryRepository.QuestionRow;
import com.jtech.repository.StudentGrammarQueryRepository.TestRow;
import com.jtech.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Màn Grammar của học viên:
 * - Material Grammar: điểm ngữ pháp đã xuất bản của bài học.
 * - Grammar Exercise: câu luyện tập (is_exercise_question = TRUE), chấm ngay, không lưu.
 * - Mini test Grammar: đề MINI_TEST / GRAMMAR đang xuất bản của bài học, có giờ làm, lưu test_attempt.
 * - Mini test Grammar result: điểm, đạt / chưa đạt, đáp án và giải thích từng câu.
 */
@Service
public class StudentGrammarService {

    /** Cho phép nộp trễ vài giây do độ trễ mạng; quá mức này thì chấm theo đáp án đã lưu. */
    static final long SUBMIT_GRACE_SECONDS = 30;
    static final String LESSON_NOT_FOUND = "Bài học ngữ pháp không tồn tại hoặc chưa được xuất bản.";
    static final String TEST_NOT_FOUND = "Bài học chưa có mini test được xuất bản.";
    static final String ATTEMPT_NOT_FOUND = "Không tìm thấy lượt làm bài.";
    static final String EMPTY_TEST = "Mini test chưa có câu hỏi.";
    static final String FOREIGN_ANSWER = "Câu trả lời không thuộc bài này.";

    /** Dữ liệu lưu trong test_attempt.answers_data: thứ tự câu hỏi lúc bắt đầu + câu trả lời. */
    public record Snapshot(List<Long> questionIds, Map<String, String> answers) {
    }

    /** Đáp án đọc từ answer_data của ngân hàng (Ngữ pháp trắc nghiệm A–D hoặc danh sách lựa chọn). */
    record Key(String type, List<StudentGrammarResponse.Option> options, String correctKey, String correctText,
               Map<String, String> matches) {
    }

    private final StudentGrammarQueryRepository queries;
    private final UserRepository users;
    private final ObjectMapper json;

    public StudentGrammarService(StudentGrammarQueryRepository queries, UserRepository users, ObjectMapper json) {
        this.queries = queries;
        this.users = users;
        this.json = json;
    }

    // ===== Material Grammar =====
    @Transactional(readOnly = true)
    public StudentGrammarResponse.Lesson lesson(long lessonId, String email) {
        StudentGrammarQueryRepository.LessonRow lesson = requireLesson(lessonId);
        long userId = userId(email);
        StudentGrammarResponse.MiniTestInfo miniTest = queries.publishedMiniTest(lessonId)
                .map(test -> miniTestInfo(test, userId)).orElse(null);
        return new StudentGrammarResponse.Lesson(lesson.id(), lesson.chapterId(), lesson.chapterNo(),
                lesson.chapterTitle(), lesson.courseName(), lesson.lessonNo(), lesson.title(), lesson.description(),
                queries.grammars(lessonId), queries.countExerciseQuestions(lessonId), miniTest);
    }

    // ===== Grammar Exercise =====
    @Transactional(readOnly = true)
    public StudentGrammarResponse.Exercise exercise(long lessonId) {
        requireLesson(lessonId);
        List<StudentGrammarResponse.Question> items = queries.exerciseQuestions(lessonId).stream()
                .map(this::toQuestion).toList();
        return new StudentGrammarResponse.Exercise(lessonId, items);
    }

    @Transactional(readOnly = true)
    public StudentGrammarResponse.CheckResult checkExercise(long lessonId, Map<String, String> answers) {
        requireLesson(lessonId);
        List<QuestionRow> items = queries.exerciseQuestions(lessonId);
        if (items.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài học chưa có câu luyện tập.");
        Map<String, String> supplied = answers == null ? Map.of() : answers;
        Set<String> ids = items.stream().map(q -> q.id().toString()).collect(Collectors.toSet());
        if (!ids.containsAll(supplied.keySet())) throw badRequest(FOREIGN_ANSWER);
        return grade(items, supplied);
    }

    // ===== Mini test Grammar =====
    /** Bắt đầu (hoặc tiếp tục) lượt làm mini test. */
    @Transactional
    public StudentGrammarResponse.Attempt start(long testId, String email) {
        long userId = userId(email);
        TestRow test = queries.miniTest(testId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_NOT_FOUND));
        if (!queries.isPublished(testId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, TEST_NOT_FOUND);
        requireLesson(test.lessonId());

        LocalDateTime now = now();
        for (AttemptRow row : queries.attempts(testId, userId)) {
            if (!"IN_PROGRESS".equals(row.status())) continue;
            if (now.isBefore(row.deadlineAt())) return attemptView(test, row, now);
            finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED", now);
        }

        List<QuestionRow> items = queries.testQuestions(testId);
        if (items.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, EMPTY_TEST);
        Snapshot snapshot = new Snapshot(items.stream().map(QuestionRow::id).toList(), Map.of());
        long id = queries.insertAttempt(testId, userId, queries.nextAttemptNo(testId, userId), items.size(),
                write(snapshot), now, now.plusMinutes(test.durationMinutes()));
        return attemptView(test, ownedAttempt(id, userId), now);
    }

    /** Mở lại lượt đang làm; hết giờ thì tự nộp theo đáp án đã lưu. */
    @Transactional
    public StudentGrammarResponse.Attempt attempt(long attemptId, String email) {
        AttemptRow row = ownedAttempt(attemptId, userId(email));
        TestRow test = testOf(row);
        LocalDateTime now = now();
        if ("IN_PROGRESS".equals(row.status()) && !now.isBefore(row.deadlineAt())) {
            finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED", now);
            row = ownedAttempt(attemptId, row.userId());
        }
        return attemptView(test, row, now);
    }

    /** Lưu tạm câu trả lời (khi học viên chọn đáp án). */
    @Transactional
    public void saveAnswers(long attemptId, Map<String, String> answers, String email) {
        AttemptRow row = ownedAttempt(attemptId, userId(email));
        if (!"IN_PROGRESS".equals(row.status())) throw conflict("Lượt làm đã nộp.");
        LocalDateTime now = now();
        if (!now.isBefore(row.deadlineAt().plusSeconds(SUBMIT_GRACE_SECONDS))) throw conflict("Đã hết giờ làm bài.");
        Snapshot snapshot = read(row.answersData());
        queries.saveAnswers(attemptId, write(new Snapshot(snapshot.questionIds(), clean(snapshot, answers))), now);
    }

    /** Nộp bài: chấm và lưu kết quả. Nộp lại lượt đã nộp thì trả kết quả cũ. */
    @Transactional
    public StudentGrammarResponse.AttemptResult submit(long attemptId, Map<String, String> answers, String email) {
        AttemptRow row = ownedAttempt(attemptId, userId(email));
        if ("IN_PROGRESS".equals(row.status())) {
            LocalDateTime now = now();
            Snapshot snapshot = read(row.answersData());
            boolean late = !now.isBefore(row.deadlineAt().plusSeconds(SUBMIT_GRACE_SECONDS));
            Map<String, String> finalAnswers = late ? snapshot.answers() : clean(snapshot, answers);
            finish(row, finalAnswers, late ? "AUTO_SUBMITTED" : "SUBMITTED", now);
            row = ownedAttempt(attemptId, row.userId());
        }
        return resultView(testOf(row), row);
    }

    /** Mini test Grammar result. */
    @Transactional
    public StudentGrammarResponse.AttemptResult result(long attemptId, String email) {
        AttemptRow row = ownedAttempt(attemptId, userId(email));
        if ("IN_PROGRESS".equals(row.status())) {
            LocalDateTime now = now();
            if (now.isBefore(row.deadlineAt())) throw conflict("Lượt làm chưa nộp.");
            finish(row, read(row.answersData()).answers(), "AUTO_SUBMITTED", now);
            row = ownedAttempt(attemptId, row.userId());
        }
        return resultView(testOf(row), row);
    }

    // ===== Chấm điểm =====
    StudentGrammarResponse.CheckResult grade(List<QuestionRow> items, Map<String, String> answers) {
        List<StudentGrammarResponse.QuestionResult> results = new ArrayList<>();
        int correct = 0;
        for (QuestionRow question : items) {
            StudentGrammarResponse.QuestionResult r = gradeOne(question, answers.get(question.id().toString()));
            if (r.correct()) correct++;
            results.add(r);
        }
        return new StudentGrammarResponse.CheckResult(correct, items.size(), score(correct, items.size()), results);
    }

    StudentGrammarResponse.QuestionResult gradeOne(QuestionRow question, String supplied) {
        Key key = key(question);
        boolean correct;
        String your;
        if ("MATCHING".equals(key.type())) {
            Map<String, String> pairs = readPairs(supplied);
            correct = !key.matches().isEmpty() && key.matches().entrySet().stream()
                    .allMatch(e -> normalize(e.getValue()).equals(normalize(pairs.get(e.getKey()))));
            your = pairs.isEmpty() ? null : pairs.entrySet().stream()
                    .map(e -> e.getKey() + " → " + e.getValue()).collect(Collectors.joining("; "));
        } else {
            correct = supplied != null && !supplied.isBlank() && normalize(supplied).equals(normalize(key.correctKey()));
            your = supplied == null || supplied.isBlank() ? null : display(key, supplied);
        }
        String correctText = "MATCHING".equals(key.type()) ? null : display(key, key.correctKey());
        return new StudentGrammarResponse.QuestionResult(question.id(), correct, your, correctText,
                "MATCHING".equals(key.type()) ? key.matches() : Map.of(), question.explanation());
    }

    /** Đọc answer_data: options là object {A: ..} (Ngữ pháp trắc nghiệm) hoặc mảng; matches cho nối cặp. */
    Key key(QuestionRow question) {
        try {
            JsonNode root = json.readTree(question.answerData() == null ? "{}" : question.answerData());
            List<StudentGrammarResponse.Option> options = new ArrayList<>();
            JsonNode optionNode = root.path("options");
            boolean keyed = optionNode.isObject();
            if (keyed) {
                Iterator<Map.Entry<String, JsonNode>> fields = optionNode.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> field = fields.next();
                    options.add(new StudentGrammarResponse.Option(field.getKey(), field.getValue().asText()));
                }
            } else if (optionNode.isArray()) {
                optionNode.forEach(n -> options.add(new StudentGrammarResponse.Option(n.asText(), n.asText())));
            }
            Map<String, String> matches = new LinkedHashMap<>();
            root.path("matches").fields().forEachRemaining(e -> matches.put(e.getKey(), e.getValue().asText()));
            String correctKey = root.path("correctAnswer").asText("");
            String correctText = options.stream().filter(o -> o.key().equals(correctKey)).map(
                    StudentGrammarResponse.Option::text).findFirst().orElse(correctKey);
            return new Key(question.questionType(), options, correctKey, correctText, matches);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Đáp án câu " + question.id() + " chưa đúng định dạng.");
        }
    }

    /** Câu hỏi cho học viên, không kèm đáp án; vế phải của câu nối được sắp xếp lại. */
    StudentGrammarResponse.Question toQuestion(QuestionRow question) {
        Key key = key(question);
        boolean matching = "MATCHING".equals(key.type());
        return new StudentGrammarResponse.Question(question.id(), question.questionType(), question.content(),
                question.grammarName(), "MCQ".equals(key.type()) ? key.options() : List.of(),
                matching ? List.copyOf(key.matches().keySet()) : List.of(),
                matching ? key.matches().values().stream().distinct().sorted().toList() : List.of());
    }

    private static String display(Key key, String value) {
        if (!"MCQ".equals(key.type())) return value;
        return key.options().stream().filter(o -> normalize(o.key()).equals(normalize(value))).findFirst()
                .map(o -> o.key().equals(o.text()) ? o.text() : o.key() + ". " + o.text()).orElse(value);
    }

    static BigDecimal score(int correct, int total) {
        if (total == 0) return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(correct * 100L).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    static String normalize(String value) {
        return value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFKC).trim()
                .replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    // ===== Helpers =====
    private void finish(AttemptRow row, Map<String, String> answers, String status, LocalDateTime now) {
        Snapshot snapshot = read(row.answersData());
        List<QuestionRow> items = ordered(snapshot.questionIds());
        StudentGrammarResponse.CheckResult graded = grade(items, answers);
        TestRow test = testOf(row);
        boolean passed = graded.score().compareTo(test.passingScore()) >= 0;
        queries.finish(row.id(), status, write(new Snapshot(snapshot.questionIds(), answers)), graded.correctCount(),
                graded.score(), passed, now);
    }

    private StudentGrammarResponse.Attempt attemptView(TestRow test, AttemptRow row, LocalDateTime now) {
        Snapshot snapshot = read(row.answersData());
        boolean open = "IN_PROGRESS".equals(row.status());
        List<StudentGrammarResponse.Question> items = open
                ? ordered(snapshot.questionIds()).stream().map(this::toQuestion).toList()
                : List.of();
        long remaining = open ? Math.max(0, Duration.between(now, row.deadlineAt()).getSeconds()) : 0;
        return new StudentGrammarResponse.Attempt(row.id(), test.id(), test.lessonId(), test.title(), row.attemptNo(),
                row.status(), test.durationMinutes(), test.passingScore(), row.startedAt(), row.deadlineAt(), remaining,
                items, open ? snapshot.answers() : Map.of());
    }

    private StudentGrammarResponse.AttemptResult resultView(TestRow test, AttemptRow row) {
        Snapshot snapshot = read(row.answersData());
        List<QuestionRow> items = ordered(snapshot.questionIds());
        StudentGrammarResponse.CheckResult graded = grade(items, snapshot.answers());
        BigDecimal score = row.score() != null ? row.score() : graded.score();
        boolean passed = row.passed() != null ? row.passed() : score.compareTo(test.passingScore()) >= 0;
        return new StudentGrammarResponse.AttemptResult(row.id(), test.id(), test.lessonId(), test.title(),
                row.attemptNo(), row.status(), score, graded.correctCount(), items.size(), test.passingScore(), passed,
                row.timeSpentSec(), row.submittedAt(), items.stream().map(this::toQuestion).toList(), graded.results());
    }

    private StudentGrammarResponse.MiniTestInfo miniTestInfo(TestRow test, long userId) {
        List<AttemptRow> rows = queries.attempts(test.id(), userId);
        LocalDateTime now = now();
        Long inProgress = rows.stream()
                .filter(r -> "IN_PROGRESS".equals(r.status()) && now.isBefore(r.deadlineAt()))
                .map(AttemptRow::id).findFirst().orElse(null);
        List<StudentGrammarResponse.AttemptSummary> attempts = rows.stream()
                .filter(r -> !"IN_PROGRESS".equals(r.status()))
                .map(r -> new StudentGrammarResponse.AttemptSummary(r.id(), r.attemptNo(), r.status(), r.score(),
                        r.correctCount(), r.totalQuestions(), r.passed(), r.submittedAt()))
                .toList();
        return new StudentGrammarResponse.MiniTestInfo(test.id(), test.title(), test.durationMinutes(),
                test.passingScore(), queries.testQuestions(test.id()).size(), inProgress, attempts);
    }

    /** Câu hỏi theo thứ tự đã chụp lúc bắt đầu (câu bị xóa khỏi DB thì bỏ qua). */
    private List<QuestionRow> ordered(List<Long> ids) {
        Map<Long, QuestionRow> byId = queries.questionsByIds(ids).stream()
                .collect(Collectors.toMap(QuestionRow::id, Function.identity(), (a, b) -> a));
        return ids.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    /** Chỉ giữ câu trả lời thuộc lượt làm. */
    private static Map<String, String> clean(Snapshot snapshot, Map<String, String> answers) {
        if (answers == null) return snapshot.answers();
        Set<String> ids = snapshot.questionIds().stream().map(String::valueOf).collect(Collectors.toSet());
        if (!ids.containsAll(answers.keySet())) throw badRequest(FOREIGN_ANSWER);
        Map<String, String> merged = new HashMap<>(snapshot.answers());
        answers.forEach((k, v) -> {
            if (v == null || v.length() > 20000) merged.remove(k);
            else merged.put(k, v);
        });
        return merged;
    }

    private Map<String, String> readPairs(String supplied) {
        if (supplied == null || supplied.isBlank() || supplied.length() > 20000) return Map.of();
        try {
            Map<String, String> pairs = json.readValue(supplied, new TypeReference<Map<String, String>>() {});
            return pairs == null ? Map.of() : pairs;
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            return Map.of();
        }
    }

    private Snapshot read(String data) {
        try {
            Snapshot snapshot = json.readValue(data, Snapshot.class);
            if (snapshot == null || snapshot.questionIds() == null) throw new IllegalArgumentException();
            return new Snapshot(snapshot.questionIds(), snapshot.answers() == null ? Map.of() : snapshot.answers());
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new IllegalStateException("Dữ liệu lượt làm không hợp lệ.");
        }
    }

    private String write(Snapshot snapshot) {
        try {
            return json.writeValueAsString(snapshot);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không lưu được câu trả lời.");
        }
    }

    private StudentGrammarQueryRepository.LessonRow requireLesson(long lessonId) {
        return queries.publishedGrammarLesson(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, LESSON_NOT_FOUND));
    }

    private AttemptRow ownedAttempt(long attemptId, long userId) {
        AttemptRow row = queries.attempt(attemptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ATTEMPT_NOT_FOUND));
        if (row.userId() != userId) throw new ResponseStatusException(HttpStatus.NOT_FOUND, ATTEMPT_NOT_FOUND);
        return row;
    }

    private TestRow testOf(AttemptRow row) {
        return queries.miniTest(row.testId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, ATTEMPT_NOT_FOUND));
    }

    private long userId(String email) {
        User user = users.findByEmail(email)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));
        return user.getUserId();
    }

    LocalDateTime now() {
        return LocalDateTime.now(StreakService.LEARNING_ZONE);
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
