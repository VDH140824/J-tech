package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.ListeningSubmitRequest;
import com.jtech.dto.response.ListeningResponses;
import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.LearningProgressRepository;
import com.jtech.repository.ListeningRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Nghe hiểu: học viên nghe đoạn hội thoại (đọc bằng TTS của trình duyệt nếu chưa có audio) rồi làm câu trắc nghiệm.
 * Bài được chấm lại ở server; đạt từ 80 điểm thì lesson LISTENING được đánh dấu hoàn thành và thưởng xu lần đạt đầu.
 */
@Service
public class ListeningService {
    public static final BigDecimal PASSING_SCORE = BigDecimal.valueOf(80);
    private static final String COIN_RULE = "LISTENING";
    private static final String NOT_FOUND = "Không tìm thấy bài nghe.";

    private final ListeningRepository listening;
    private final LearningProgressRepository progress;
    private final LearningActivityService activities;
    private final CoinRewardService coins;
    private final CoinTransactionRepository coinTransactions;
    private final ObjectMapper json;

    public ListeningService(ListeningRepository listening, LearningProgressRepository progress,
            LearningActivityService activities, CoinRewardService coins, CoinTransactionRepository coinTransactions,
            ObjectMapper json) {
        this.listening = listening;
        this.progress = progress;
        this.activities = activities;
        this.coins = coins;
        this.coinTransactions = coinTransactions;
        this.json = json;
    }

    record Item(ListeningRepository.QuestionRow row, McqAnswerData.Data data) {}

    @Transactional(readOnly = true)
    public List<ListeningResponses.LessonItem> list(Long courseId, long studentId) {
        return listening.findPublishedLessons(courseId, studentId).stream()
            .map(l -> new ListeningResponses.LessonItem(l.lessonId(), l.title(), l.courseId(), l.courseName(),
                l.chapterNo(), l.completed()))
            .toList();
    }

    @Transactional(readOnly = true)
    public ListeningResponses.Detail detail(long lessonId, long studentId) {
        var exercise = requireExercise(lessonId);
        List<ListeningResponses.Question> questions = items(exercise.exerciseId()).stream()
            .map(i -> new ListeningResponses.Question(i.row().id(), i.row().content(), i.data().options()))
            .toList();
        return new ListeningResponses.Detail(exercise.lessonId(), exercise.exerciseId(), exercise.title(),
            exercise.courseId(), exercise.courseName(), exercise.chapterNo(), blankToNull(exercise.audioUrl()),
            exercise.scriptJp(), listening.isCompleted(studentId, lessonId), questions);
    }

    @Transactional
    public ListeningResponses.Result submit(long lessonId, long studentId, ListeningSubmitRequest request) {
        var exercise = requireExercise(lessonId);
        Map<Long, Item> pool = new LinkedHashMap<>();
        for (Item item : items(exercise.exerciseId())) pool.put(item.row().id(), item);
        if (pool.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND);
        Map<String, String> answers = request == null || request.answers() == null ? Map.of() : request.answers();

        Map<Long, String> selected = new LinkedHashMap<>();
        for (var entry : answers.entrySet()) {
            Long id = parseId(entry.getKey());
            if (id == null || !pool.containsKey(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không thuộc bài nghe.");
            }
            String letter = McqAnswerData.letter(entry.getValue());
            if (letter != null) selected.put(id, letter);
        }
        if (selected.size() != pool.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng trả lời tất cả câu hỏi.");
        }

        List<ListeningResponses.QuestionResult> results = new ArrayList<>();
        Map<String, String> saved = new LinkedHashMap<>();
        int correct = 0;
        for (Item item : pool.values()) {
            String choice = selected.get(item.row().id());
            boolean ok = choice.equals(item.data().correctAnswer());
            if (ok) correct++;
            saved.put(String.valueOf(item.row().id()), choice);
            results.add(new ListeningResponses.QuestionResult(item.row().id(), choice, item.data().correctAnswer(), ok,
                item.row().explanation()));
        }
        int total = results.size();
        BigDecimal score = BigDecimal.valueOf(correct * 100L).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        boolean passed = score.compareTo(PASSING_SCORE) >= 0;
        boolean completedBefore = listening.isCompleted(studentId, lessonId);

        LocalDateTime submitted = LocalDateTime.now(StreakService.LEARNING_ZONE);
        long attemptId = listening.saveAttempt(studentId, lessonId, exercise.exerciseId(), total, correct, score,
            write(saved), submitted);
        // Khóa tài khoản và ghi nhận ngày học trước khi thưởng xu (cùng transaction).
        activities.recordPracticeCompletion(studentId, attemptId);

        long coinsAwarded = 0;
        if (passed) {
            listening.saveLessonCompletion(studentId, lessonId, score, submitted);
            coinsAwarded = awardFirstPass(studentId, exercise.exerciseId(), attemptId);
            if (coinsAwarded > 0) listening.saveAttemptCoins(attemptId, coinsAwarded);
        }
        return new ListeningResponses.Result(total, correct, score, PASSING_SCORE, passed, coinsAwarded,
            passed || completedBefore, results, exercise.scriptVi());
    }

    private long awardFirstPass(long studentId, long exerciseId, long attemptId) {
        var amount = progress.findEnabledCoinReward(COIN_RULE);
        if (amount.isEmpty()) return 0;
        String key = "LISTENING:" + studentId + ":" + exerciseId;
        if (coinTransactions.findByAwardKey(key).isPresent()) return 0;
        coins.awardCoins(studentId,
            new CoinRewardService.ActivityRef(CoinRewardService.SourceType.PRACTICE, attemptId),
            new CoinRewardService.RewardAllocation(amount.get(), 0), key);
        return amount.get();
    }

    private ListeningRepository.Exercise requireExercise(long lessonId) {
        return listening.findPublishedExercise(lessonId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
    }

    /** Câu có answer_data hỏng bị bỏ qua để không chặn cả bài. */
    private List<Item> items(long exerciseId) {
        List<Item> list = new ArrayList<>();
        for (var row : listening.findQuestions(exerciseId)) {
            var data = McqAnswerData.read(row.answerData(), json);
            if (data != null) list.add(new Item(row, data));
        }
        return list;
    }

    private String write(Map<String, String> answers) {
        try {
            return json.writeValueAsString(answers);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static Long parseId(String value) {
        try {
            return value == null ? null : Long.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
