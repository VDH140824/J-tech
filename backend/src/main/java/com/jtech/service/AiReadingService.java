package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.AiReadingRequests;
import com.jtech.dto.response.AiReadingResponses;
import com.jtech.repository.AiReadingRepository;
import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.LearningProgressRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Đọc hiểu AI: Gemini viết bài đọc và 5 câu trắc nghiệm từ từ vựng, ngữ pháp, kanji của một bài (chương) hoặc cả môn.
 * Đáp án đúng chỉ nằm ở server; bài được chấm khi nộp, đạt từ 80 điểm thì thưởng xu và đánh dấu lesson READING hoàn thành.
 */
@Service
public class AiReadingService {
    public static final BigDecimal PASSING_SCORE = BigDecimal.valueOf(80);
    private static final String COIN_RULE = "READING";
    private static final String NOT_FOUND = "Không tìm thấy bài đọc.";
    private static final int VOCABULARY_LIMIT = 40;
    private static final int GRAMMAR_LIMIT = 10;
    private static final int KANJI_LIMIT = 30;

    private final AiReadingRepository readings;
    private final ReadingGeneratorClient generator;
    private final LearningProgressRepository progress;
    private final LearningActivityService activities;
    private final CoinRewardService coins;
    private final CoinTransactionRepository coinTransactions;
    private final ObjectMapper json;
    private final int dailyLimit;

    public AiReadingService(AiReadingRepository readings, ReadingGeneratorClient generator,
            LearningProgressRepository progress, LearningActivityService activities, CoinRewardService coins,
            CoinTransactionRepository coinTransactions, ObjectMapper json,
            @Value("${app.reading.daily-limit:10}") int dailyLimit) {
        this.readings = readings;
        this.generator = generator;
        this.progress = progress;
        this.activities = activities;
        this.coins = coins;
        this.coinTransactions = coinTransactions;
        this.json = json;
        this.dailyLimit = dailyLimit;
    }

    /** Một câu hỏi đã lưu trong questions_data. */
    record StoredQuestion(String content, Map<String, String> options, String correctAnswer, String explanation) {}

    /** Không chạy trong transaction vì phải chờ Gemini; mỗi lần ghi DB là một câu lệnh độc lập. */
    public AiReadingResponses.Detail create(AiReadingRequests.Create request, long studentId) {
        if (!generator.isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Tính năng AI chưa được cấu hình.");
        }
        AiReadingRepository.Scope scope = resolveScope(request);
        if (scope.lessonId() != null) {
            var existing = readings.findGeneratedForLesson(studentId, scope.lessonId());
            if (existing.isPresent()) return detail(existing.get(), scope);
        }
        LocalDateTime now = LocalDateTime.now(StreakService.LEARNING_ZONE);
        LocalDateTime startOfDay = LocalDate.now(StreakService.LEARNING_ZONE).atStartOfDay();
        if (readings.countCreatedSince(studentId, startOfDay) >= dailyLimit) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Bạn đã tạo đủ " + dailyLimit + " bài đọc hôm nay.");
        }
        var source = new ReadingGeneratorClient.Source(scopeLabel(scope),
            readings.findVocabulary(scope, VOCABULARY_LIMIT), readings.findGrammar(scope, GRAMMAR_LIMIT),
            readings.findKanji(scope, KANJI_LIMIT));
        if (source.vocabulary().isEmpty() && source.grammar().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài này chưa có đủ dữ liệu để tạo bài đọc.");
        }

        ReadingGeneratorClient.Reply reply = null;
        int inputTokens = 0;
        int outputTokens = 0;
        for (int attempt = 0; attempt < 2; attempt++) {
            var candidate = generator.generate(source);
            if (candidate == null) continue;
            inputTokens += candidate.inputTokens();
            outputTokens += candidate.outputTokens();
            if (isValid(candidate.passage())) {
                reply = candidate;
                break;
            }
        }
        if (reply == null) {
            readings.createSession(studentId, scope, "FAILED", 0, "[]", null, inputTokens, outputTokens, now);
            // Khi mọi model đều bận: giao một bài đã tạo trước đó cho cùng phạm vi thay vì báo lỗi.
            var stored = readings.findReusablePassage(scope, studentId);
            if (stored.isPresent()) {
                var copy = stored.get();
                long id = readings.createSession(studentId, scope, "GENERATED", copy.totalQuestions(),
                    copy.questionsData(), write(reusablePassageData(readPassage(copy.passageData()))), 0, 0, now);
                return detail(readings.findSession(id).orElseThrow(), scope);
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI đang bận, vui lòng thử lại sau.");
        }

        var passage = reply.passage();
        List<StoredQuestion> questions = passage.questions().stream()
            .map(q -> new StoredQuestion(q.content(), normalizedOptions(q.options()),
                McqAnswerData.letter(q.correctAnswer()), q.explanation()))
            .toList();
        Map<String, Object> passageData = new LinkedHashMap<>();
        passageData.put("title", passage.title());
        passageData.put("passageJp", passage.passageJp());
        passageData.put("translationVi", passage.translationVi());
        long id = readings.createSession(studentId, scope, "GENERATED", questions.size(), write(questions),
            write(passageData), inputTokens, outputTokens, now);
        return detail(readings.findSession(id).orElseThrow(), scope);
    }

    @Transactional(readOnly = true)
    public AiReadingResponses.Detail get(long id, long studentId) {
        var session = readings.findSession(id)
            .filter(s -> s.userId() == studentId && !"FAILED".equals(s.status()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
        return detail(session, scopeOf(session));
    }

    @Transactional
    public AiReadingResponses.Result submit(long id, long studentId, AiReadingRequests.Submit request) {
        var session = readings.lockSession(id)
            .filter(s -> s.userId() == studentId && !"FAILED".equals(s.status()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
        if ("SUBMITTED".equals(session.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bài đọc này đã được nộp.");
        }
        List<StoredQuestion> questions = readQuestions(session.questionsData());
        if (questions.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND);
        Map<String, String> answers = request == null || request.answers() == null ? Map.of() : request.answers();

        Map<Integer, String> selected = new LinkedHashMap<>();
        for (var entry : answers.entrySet()) {
            Integer index = parseIndex(entry.getKey());
            if (index == null || index < 0 || index >= questions.size()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không thuộc bài đọc.");
            }
            String letter = McqAnswerData.letter(entry.getValue());
            if (letter != null) selected.put(index, letter);
        }
        if (selected.size() != questions.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng trả lời tất cả câu hỏi.");
        }

        Map<String, String> saved = new LinkedHashMap<>();
        int correct = 0;
        for (int i = 0; i < questions.size(); i++) {
            String choice = selected.get(i);
            if (choice.equals(questions.get(i).correctAnswer())) correct++;
            saved.put(String.valueOf(i), choice);
        }
        BigDecimal score = score(correct, questions.size());
        boolean passed = score.compareTo(PASSING_SCORE) >= 0;

        LocalDateTime submitted = LocalDateTime.now(StreakService.LEARNING_ZONE);
        readings.markSubmitted(id, correct, write(saved), submitted);
        // Khóa tài khoản và ghi nhận ngày học trước khi thưởng xu (cùng transaction).
        activities.recordReadingCompletion(studentId, id, submitted);

        long coinsAwarded = 0;
        if (passed) {
            if (session.lessonId() != null) readings.saveLessonCompletion(studentId, session.lessonId(), score, submitted);
            coinsAwarded = award(studentId, id);
            if (coinsAwarded > 0) readings.saveSessionCoins(id, coinsAwarded);
        }
        return result(questions, saved, coinsAwarded, readPassage(session.passageData()).path("translationVi").asText(""));
    }

    @Transactional(readOnly = true)
    public AiReadingResponses.Page history(long studentId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);
        var items = readings.findHistory(studentId, safeSize, safePage * safeSize).stream()
            .map(h -> new AiReadingResponses.HistoryItem(h.id(), h.title(), h.courseName(), h.chapterNo(), h.status(),
                h.totalQuestions(), h.correctCount(), h.coinAwarded(), h.createdAt(), h.submittedAt()))
            .toList();
        return new AiReadingResponses.Page(items, safePage, safeSize, readings.countHistory(studentId));
    }

    private long award(long studentId, long sessionId) {
        var amount = progress.findEnabledCoinReward(COIN_RULE);
        if (amount.isEmpty()) return 0;
        String key = "READING:" + studentId + ":" + sessionId;
        if (coinTransactions.findByAwardKey(key).isPresent()) return 0;
        coins.awardCoins(studentId,
            new CoinRewardService.ActivityRef(CoinRewardService.SourceType.PRACTICE, sessionId),
            new CoinRewardService.RewardAllocation(amount.get(), 0), key);
        return amount.get();
    }

    private AiReadingRepository.Scope resolveScope(AiReadingRequests.Create request) {
        if (request != null && request.lessonId() != null) {
            return readings.findLessonScope(request.lessonId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài đọc hiểu."));
        }
        if (request != null && request.chapterId() != null) {
            var scope = readings.findChapterScope(request.chapterId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học."));
            if (request.courseId() != null && !request.courseId().equals(scope.courseId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài học không thuộc môn đã chọn.");
            }
            return scope;
        }
        if (request != null && request.courseId() != null) {
            return readings.findCourseScope(request.courseId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy môn học."));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn môn học hoặc bài học.");
    }

    /** Phạm vi để hiển thị lại một bài đã tạo; môn/chương có thể đã bị ẩn sau khi tạo. */
    private AiReadingRepository.Scope scopeOf(AiReadingRepository.Session session) {
        AiReadingRepository.Scope scope = null;
        if (session.chapterId() != null) scope = readings.findChapterScope(session.chapterId()).orElse(null);
        if (scope == null && session.courseId() != null) scope = readings.findCourseScope(session.courseId()).orElse(null);
        if (scope == null) return null;
        return new AiReadingRepository.Scope(scope.courseId(), scope.courseName(), scope.chapterId(), scope.chapterNo(),
            scope.chapterTitle(), session.lessonId());
    }

    private static String scopeLabel(AiReadingRepository.Scope scope) {
        return scope.chapterNo() == null ? scope.courseName() + " (toàn bộ môn)"
            : scope.courseName() + " · Bài " + scope.chapterNo() + (scope.chapterTitle() == null ? "" : " — " + scope.chapterTitle());
    }

    private AiReadingResponses.Detail detail(AiReadingRepository.Session session, AiReadingRepository.Scope scope) {
        List<StoredQuestion> questions = readQuestions(session.questionsData());
        JsonNode passage = readPassage(session.passageData());
        List<AiReadingResponses.Question> view = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            view.add(new AiReadingResponses.Question(i, questions.get(i).content(), questions.get(i).options()));
        }
        AiReadingResponses.Result result = null;
        if ("SUBMITTED".equals(session.status())) {
            Map<String, String> answers = new LinkedHashMap<>();
            passage.path("answers").fields().forEachRemaining(e -> answers.put(e.getKey(), e.getValue().asText()));
            result = result(questions, answers, session.coinAwarded(), passage.path("translationVi").asText(""));
        }
        return new AiReadingResponses.Detail(session.id(), passage.path("title").asText(""),
            passage.path("passageJp").asText(""), session.courseId(), scope == null ? null : scope.courseName(),
            session.chapterId(), scope == null ? null : scope.chapterNo(), session.lessonId(), session.status(), view,
            session.createdAt(), result);
    }

    private static AiReadingResponses.Result result(List<StoredQuestion> questions, Map<String, String> answers,
            long coinsAwarded, String translationVi) {
        List<AiReadingResponses.QuestionResult> results = new ArrayList<>();
        int correct = 0;
        for (int i = 0; i < questions.size(); i++) {
            var q = questions.get(i);
            String choice = answers.get(String.valueOf(i));
            boolean ok = choice != null && choice.equals(q.correctAnswer());
            if (ok) correct++;
            results.add(new AiReadingResponses.QuestionResult(i, choice, q.correctAnswer(), ok, q.explanation()));
        }
        BigDecimal score = score(correct, questions.size());
        return new AiReadingResponses.Result(questions.size(), correct, score, PASSING_SCORE,
            score.compareTo(PASSING_SCORE) >= 0, coinsAwarded, translationVi, results);
    }

    /** {漢字|かんじ}, hoặc {ベトナム} khi Gemini lỡ bọc chữ không có cách đọc. */
    private static final java.util.regex.Pattern FURIGANA = java.util.regex.Pattern.compile("\\{([^{}|]+)(?:\\|[^{}|]*)?\\}");

    /** Bỏ cú pháp furigana {漢字|かんじ} (và {kana} bọc nhầm) để còn chữ hiển thị. */
    static String stripFurigana(String value) {
        return value == null ? null : FURIGANA.matcher(value).replaceAll("$1");
    }

    /**
     * Gemini phải trả bài đọc đủ dài (không tính furigana) và đúng 5 câu, mỗi câu đủ 4 lựa chọn khác rỗng
     * và một đáp án A–D.
     */
    static boolean isValid(ReadingGeneratorClient.Passage passage) {
        if (passage == null || isBlank(passage.title()) || isBlank(passage.passageJp())
                || stripFurigana(passage.passageJp()).strip().length() < ReadingGeneratorClient.MIN_PASSAGE_LENGTH
                || isBlank(passage.translationVi()) || passage.questions() == null
                || passage.questions().size() != ReadingGeneratorClient.QUESTION_COUNT) return false;
        for (var q : passage.questions()) {
            if (q == null || isBlank(q.content()) || q.options() == null || McqAnswerData.letter(q.correctAnswer()) == null) {
                return false;
            }
            for (String letter : McqAnswerData.LETTERS) if (isBlank(q.options().get(letter))) return false;
        }
        return true;
    }

    private static Map<String, String> normalizedOptions(Map<String, String> options) {
        Map<String, String> ordered = new LinkedHashMap<>();
        for (String letter : McqAnswerData.LETTERS) ordered.put(letter, options.get(letter).trim());
        return ordered;
    }

    private List<StoredQuestion> readQuestions(String raw) {
        List<StoredQuestion> list = new ArrayList<>();
        if (raw == null || raw.isBlank()) return list;
        try {
            for (JsonNode node : json.readTree(raw)) {
                Map<String, String> options = new LinkedHashMap<>();
                for (String letter : McqAnswerData.LETTERS) {
                    if (node.path("options").hasNonNull(letter)) options.put(letter, node.path("options").get(letter).asText());
                }
                list.add(new StoredQuestion(node.path("content").asText(""), options,
                    McqAnswerData.letter(node.path("correctAnswer").asText(null)), node.path("explanation").asText("")));
            }
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("questions_data không hợp lệ", ex);
        }
        return list;
    }

    private JsonNode readPassage(String raw) {
        try {
            return raw == null || raw.isBlank() ? json.createObjectNode() : json.readTree(raw);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("passage_data không hợp lệ", ex);
        }
    }

    /** Chỉ chép nội dung bài đọc sang bài mới, bỏ đáp án và mọi dữ liệu làm bài của người trước. */
    static Map<String, Object> reusablePassageData(JsonNode passage) {
        Map<String, Object> copy = new LinkedHashMap<>();
        for (String key : List.of("title", "passageJp", "translationVi")) copy.put(key, passage.path(key).asText(""));
        return copy;
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static BigDecimal score(int correct, int total) {
        if (total == 0) return BigDecimal.ZERO.setScale(2);
        return BigDecimal.valueOf(correct * 100L).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private static Integer parseIndex(String value) {
        try {
            return value == null ? null : Integer.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || stripFurigana(value).isBlank();
    }
}
