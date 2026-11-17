package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.StudentConjugationResponse;
import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Course;
import com.jtech.entity.Question;
import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.ConjugationFormRepository;
import com.jtech.repository.LearningProgressRepository;
import com.jtech.repository.QuestionConjugationRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thể chia phía học viên: Conjugation List (UC-21, UC-22) và Conjugation Practice (UC-23).
 *
 * Câu luyện tập là question (skill CONJUGATION, conjugation_form_id, is_exercise_question, ACTIVE). Vì bảng
 * question không có cột riêng cho động từ, answer_data của câu thể chia có dạng:
 * {"verb":"書く","reading":"かく","meaningVi":"viết","verbGroup":1,"correctAnswer":"書いて",
 *  "acceptedAnswers":["かいて"],"options":["書いて","書きて","書って","書かて"]}   (options không bắt buộc)
 *
 * Mỗi lượt luyện tập lấy ngẫu nhiên questions_per_practice câu (UC-47, BR-104) trong các câu luyện tập của
 * thể chia, sau khi lọc theo nhóm động từ (BR-95). Nếu số câu ít hơn thì lượt gồm tất cả các câu.
 */
@Service
public class StudentConjugationService {
    public static final BigDecimal PASSING_SCORE = BigDecimal.valueOf(80);
    private static final String COIN_RULE = "CONJUGATION";
    private static final String MODE_TYPED = "typed";
    private static final String MODE_CHOICE = "choice";
    private static final String NO_CONTENT = "Chưa có dữ liệu được tạo.";

    private final ConjugationFormRepository forms;
    private final QuestionConjugationRepository questions;
    private final LearningProgressRepository progress;
    private final LearningActivityService activities;
    private final CoinRewardService coins;
    private final CoinTransactionRepository coinTransactions;
    private final ObjectMapper json;

    public StudentConjugationService(ConjugationFormRepository forms, QuestionConjugationRepository questions,
            LearningProgressRepository progress, LearningActivityService activities, CoinRewardService coins,
            CoinTransactionRepository coinTransactions, ObjectMapper json) {
        this.forms = forms;
        this.questions = questions;
        this.progress = progress;
        this.activities = activities;
        this.coins = coins;
        this.coinTransactions = coinTransactions;
        this.json = json;
    }

    /** Dữ liệu câu thể chia đọc từ answer_data. */
    record Item(Question question, String verb, String reading, String meaningVi, int verbGroup,
        String correctAnswer, List<String> acceptedAnswers, List<String> options) {}

    // ===== UC-21: danh sách thể chia =====
    @Transactional(readOnly = true)
    public List<StudentConjugationResponse.FormCard> list(String keyword, int verbGroup, String difficulty, long studentId) {
        int group = group(verbGroup);
        Question.Difficulty level = difficulty(difficulty);
        String key = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        Map<Long, LearningProgressRepository.ConjugationSummary> summaries = progress.findConjugationSummaries(studentId);
        List<StudentConjugationResponse.FormCard> cards = new ArrayList<>();
        for (ConjugationForm form : forms.findByStatusOrderByDisplayOrderAscIdAsc(Course.Status.PUBLISHED)) {
            if (!key.isEmpty() && !matches(form, key)) continue;
            var summary = summaries.get(form.getId());
            cards.add(new StudentConjugationResponse.FormCard(form.getId(), form.getCode(), form.getNameVi(),
                form.getNameJp(), form.getDescription(), perSession(form), items(form.getId(), group, level).size(),
                summary == null ? 0 : summary.attempts(), summary == null ? null : summary.bestScore(),
                passed(summary)));
        }
        return cards;
    }

    // ===== UC-22: “Xem cách chia” =====
    @Transactional(readOnly = true)
    public StudentConjugationResponse.FormDetail detail(long formId, int verbGroup, String difficulty, long studentId) {
        ConjugationForm form = requirePublished(formId);
        int group = group(verbGroup);
        Question.Difficulty level = difficulty(difficulty);
        List<Item> all = items(formId, 0, null);
        // Số câu theo nhóm (trong độ khó đang chọn) và theo độ khó (trong nhóm đang chọn) để làm mờ lựa chọn không có câu
        Map<Integer, Integer> counts = new LinkedHashMap<>();
        for (int g = 0; g <= 3; g++) {
            final int current = g;
            counts.put(g, (int) all.stream()
                .filter(i -> (current == 0 || i.verbGroup() == current) && matchesLevel(i, level)).count());
        }
        Map<String, Integer> levelCounts = new LinkedHashMap<>();
        levelCounts.put(ALL_LEVELS, (int) all.stream().filter(i -> group == 0 || i.verbGroup() == group).count());
        for (Question.Difficulty d : Question.Difficulty.values()) {
            levelCounts.put(d.name(), (int) all.stream()
                .filter(i -> (group == 0 || i.verbGroup() == group) && i.question().getDifficulty() == d).count());
        }
        var summary = progress.findConjugationSummaries(studentId).get(formId);
        return new StudentConjugationResponse.FormDetail(form.getId(), form.getCode(), form.getNameVi(),
            form.getNameJp(), form.getDescription(), form.getMaterialContent(), group, levelName(level), perSession(form),
            counts, levelCounts,
            summary == null ? 0 : summary.attempts(), summary == null ? null : summary.bestScore(), passed(summary));
    }

    // ===== UC-23: bắt đầu một lượt — lấy ngẫu nhiên N câu =====
    @Transactional(readOnly = true)
    public StudentConjugationResponse.PracticeSession start(long formId, int verbGroup, String difficulty, String mode) {
        ConjugationForm form = requirePublished(formId);
        int group = group(verbGroup);
        Question.Difficulty level = difficulty(difficulty);
        String practiceMode = mode(mode);
        List<Item> all = items(formId, 0, null);
        List<Item> pool = new ArrayList<>(all.stream()
            .filter(i -> (group == 0 || i.verbGroup() == group) && matchesLevel(i, level)).toList());
        if (pool.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, NO_CONTENT);
        Collections.shuffle(pool); // chọn ngẫu nhiên và xáo thứ tự câu
        List<Item> picked = pool.subList(0, Math.min(perSession(form), pool.size()));
        List<String> answersPool = all.stream().map(Item::correctAnswer).distinct().toList();
        List<StudentConjugationResponse.Question> list = picked.stream()
            .map(i -> new StudentConjugationResponse.Question(i.question().getId(), i.question().getContent(),
                i.verb(), i.reading(), i.meaningVi(), i.verbGroup() == 0 ? null : i.verbGroup(),
                // Luôn kèm phương án để học viên đổi “Nhập đáp án” ↔ “Trắc nghiệm” giữa chừng mà không mất lượt.
                options(i, answersPool)))
            .toList();
        return new StudentConjugationResponse.PracticeSession(form.getId(), form.getNameVi(), form.getNameJp(),
            group, levelName(level), practiceMode, perSession(form), list);
    }

    // ===== UC-23 bước 3–5: “Kiểm tra” một câu (BR-98) =====
    @Transactional(readOnly = true)
    public StudentConjugationResponse.CheckResult check(long formId, StudentConjugationResponse.CheckRequest request) {
        requirePublished(formId);
        if (request == null || request.questionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không hợp lệ.");
        }
        if (request.answer() == null || request.answer().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập đáp án.");
        }
        Item item = items(formId, 0, null).stream()
            .filter(i -> i.question().getId().equals(request.questionId()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy câu hỏi."));
        return grade(item, request.answer());
    }

    // ===== Hoàn thành lượt: chấm lại ở server, lưu lượt, ghi nhận ngày học, thưởng xu lần đạt đầu =====
    @Transactional
    public StudentConjugationResponse.Result submit(long formId, long studentId,
            StudentConjugationResponse.SubmitRequest request) {
        ConjugationForm form = requirePublished(formId);
        int group = group(request == null || request.verbGroup() == null ? 0 : request.verbGroup());
        Question.Difficulty level = difficulty(request == null ? null : request.difficulty());
        String practiceMode = mode(request == null ? null : request.mode());
        Map<String, String> answers = request == null || request.answers() == null ? Map.of() : request.answers();
        // Lượt không lưu trên server: kiểm tra các câu gửi lên đều thuộc thể chia + nhóm và đúng số câu một lượt.
        Map<Long, Item> pool = new LinkedHashMap<>();
        for (Item item : items(formId, group, level)) pool.put(item.question().getId(), item);
        int expected = Math.min(perSession(form), pool.size());
        if (answers.isEmpty() || answers.size() != expected) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng trả lời tất cả câu hỏi trước khi hoàn thành.");
        }
        Map<String, String> saved = new LinkedHashMap<>();
        List<StudentConjugationResponse.CheckResult> details = new ArrayList<>();
        int correct = 0;
        for (var entry : answers.entrySet()) {
            Item item = pool.get(parseId(entry.getKey()));
            if (item == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không thuộc lượt luyện tập.");
            String answer = entry.getValue() == null ? "" : entry.getValue().trim();
            if (answer.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng trả lời tất cả câu hỏi trước khi hoàn thành.");
            }
            saved.put(String.valueOf(item.question().getId()), answer.length() > 100 ? answer.substring(0, 100) : answer);
            var result = grade(item, answer);
            if (result.correct()) correct++;
            details.add(result);
        }
        BigDecimal score = BigDecimal.valueOf(correct * 100L)
            .divide(BigDecimal.valueOf(details.size()), 2, RoundingMode.HALF_UP);
        var record = activities.recordConjugationPracticeCompletion(studentId, formId, group, levelName(level), practiceMode,
            details.size(), correct, score, saved);
        boolean passed = score.compareTo(PASSING_SCORE) >= 0;
        long coinsAwarded = passed ? awardFirstPass(studentId, formId, record.attemptId()) : 0;
        return new StudentConjugationResponse.Result(formId, group, details.size(), correct, score,
            PASSING_SCORE, passed, coinsAwarded, details);
    }

    // ===== Helpers =====
    private long awardFirstPass(long studentId, long formId, long attemptId) {
        var amount = progress.findEnabledCoinReward(COIN_RULE);
        if (amount.isEmpty()) return 0;
        String key = "CONJUGATION:" + studentId + ":" + formId;
        // Tài khoản đã được khóa dòng trong cùng transaction (recordConjugationPracticeCompletion).
        if (coinTransactions.findByAwardKey(key).isPresent()) return 0;
        coins.awardCoins(studentId,
            new CoinRewardService.ActivityRef(CoinRewardService.SourceType.PRACTICE, attemptId),
            new CoinRewardService.RewardAllocation(amount.get(), 0), key);
        return amount.get();
    }

    private static boolean passed(LearningProgressRepository.ConjugationSummary summary) {
        return summary != null && summary.bestScore() != null && summary.bestScore().compareTo(PASSING_SCORE) >= 0;
    }

    private static Long parseId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private StudentConjugationResponse.CheckResult grade(Item item, String answer) {
        String given = normalize(answer);
        Set<String> accepted = new LinkedHashSet<>();
        accepted.add(normalize(item.correctAnswer()));
        item.acceptedAnswers().forEach(a -> accepted.add(normalize(a)));
        boolean correct = !given.isEmpty() && accepted.contains(given);
        return new StudentConjugationResponse.CheckResult(item.question().getId(), correct, item.correctAnswer(),
            item.acceptedAnswers(), item.question().getExplanation());
    }

    /** BR-97: chuẩn hóa đáp án (xem ConjugationAnswerData.normalize). */
    static String normalize(String value) {
        return ConjugationAnswerData.normalize(value);
    }

    /** Phương án trắc nghiệm: dùng options do Moderator nhập, thiếu thì lấy đáp án đúng của câu khác làm nhiễu. */
    private List<String> options(Item item, List<String> pool) {
        List<String> result = new ArrayList<>();
        result.add(item.correctAnswer());
        List<String> source = item.options().isEmpty() ? new ArrayList<>(pool) : new ArrayList<>(item.options());
        Random random = new Random(item.question().getId()); // cố định theo câu để tải lại không đổi
        Collections.shuffle(source, random);
        for (String option : source) {
            if (result.size() >= 4) break;
            if (!option.isBlank() && result.stream().noneMatch(o -> normalize(o).equals(normalize(option)))) {
                result.add(option);
            }
        }
        if (result.size() < 2) return null; // không đủ phương án → câu này dùng ô nhập
        Collections.shuffle(result, random);
        return result;
    }

    private List<Item> items(long formId, int group, Question.Difficulty level) {
        List<Item> list = new ArrayList<>();
        for (Question q : questions.findStudentPracticeQuestions(formId, Question.QuestionStatus.ACTIVE)) {
            // Câu đã gắn conjugation_form_id là câu thể chia (không loại theo skill để tránh lệch dữ liệu nhập tay).
            Item item = parse(q);
            if (item == null) continue;
            if ((group == 0 || item.verbGroup() == group) && matchesLevel(item, level)) list.add(item);
        }
        return list;
    }

    /** Đọc answer_data qua định dạng dùng chung (ConjugationAnswerData). null nếu không xác định được đáp án. */
    private Item parse(Question q) {
        ConjugationAnswerData.Data d = ConjugationAnswerData.read(q, json);
        return d == null ? null : new Item(q, d.verb(), d.reading(), d.meaningVi(), d.verbGroup(),
            d.correctAnswer(), d.acceptedAnswers(), d.options());
    }

    private static int perSession(ConjugationForm form) {
        Integer value = form.getQuestionsPerPractice();
        return value == null || value < 1 ? 10 : value;
    }

    private static int group(int value) {
        if (value < 0 || value > 3) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nhóm động từ không hợp lệ.");
        return value;
    }

    private static final String ALL_LEVELS = "ALL";

    /** null / "" / "ALL" = mọi độ khó; EASY / MEDIUM / HARD. */
    private static Question.Difficulty difficulty(String value) {
        if (value == null || value.isBlank() || ALL_LEVELS.equalsIgnoreCase(value.trim())) return null;
        try {
            return Question.Difficulty.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Độ khó không hợp lệ.");
        }
    }

    private static String levelName(Question.Difficulty level) {
        return level == null ? ALL_LEVELS : level.name();
    }

    private static boolean matchesLevel(Item item, Question.Difficulty level) {
        return level == null || item.question().getDifficulty() == level;
    }

    private static String mode(String value) {
        return MODE_CHOICE.equalsIgnoreCase(value) ? MODE_CHOICE : MODE_TYPED;
    }

    private static boolean matches(ConjugationForm form, String key) {
        return contains(form.getNameVi(), key) || contains(form.getNameJp(), key) || contains(form.getCode(), key)
            || contains(form.getDescription(), key);
    }

    private static boolean contains(String value, String key) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(key);
    }

    private ConjugationForm requirePublished(long formId) {
        ConjugationForm form = forms.findById(formId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NO_CONTENT));
        if (form.getStatus() != Course.Status.PUBLISHED) throw new ResponseStatusException(HttpStatus.NOT_FOUND, NO_CONTENT);
        return form;
    }
}