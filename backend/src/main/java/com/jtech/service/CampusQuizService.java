package com.jtech.service;

import static com.jtech.dto.campusquiz.CampusQuizDtos.QUESTION_COUNT;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.campus.CampusQuizSessionStore;
import com.jtech.campus.CampusQuizSessionStore.QuestionSnapshot;
import com.jtech.dto.campusquiz.CampusQuizDtos.CourseSummary;
import com.jtech.dto.campusquiz.CampusQuizDtos.Option;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuestionResult;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizError;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizQuestion;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizResult;
import com.jtech.dto.campusquiz.CampusQuizDtos.StartResponse;
import com.jtech.dto.campusquiz.CampusQuizDtos.SubmitRequest;
import com.jtech.entity.Course;
import com.jtech.repository.CampusQuizQuestionRepository;
import com.jtech.repository.CampusQuizQuestionRepository.Candidate;
import com.jtech.repository.CourseRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CampusQuizService {
    private static final Logger log = LoggerFactory.getLogger(CampusQuizService.class);
    private static final int PASSING_COUNT = 25;
    private static final String INSUFFICIENT_QUESTIONS_MESSAGE =
        "Không đủ 50 câu hỏi để bắt đầu bài kiểm tra. Vui lòng chọn khóa học khác.";

    public static class QuizException extends RuntimeException {
        private final HttpStatus status;
        private final QuizError error;

        public QuizException(HttpStatus status, String code, String message, Integer availableCount) {
            super(message);
            this.status = status;
            this.error = new QuizError(code, message, availableCount);
        }

        public HttpStatus status() {
            return status;
        }

        public QuizError error() {
            return error;
        }
    }

    private final CourseRepository courses;
    private final CampusQuizQuestionRepository questions;
    private final CampusQuizSessionStore sessions;
    private final CampusQuizRewardService rewards;
    private final ObjectMapper json;
    private final Duration sessionTtl;

    public CampusQuizService(
        CourseRepository courses,
        CampusQuizQuestionRepository questions,
        CampusQuizSessionStore sessions,
        CampusQuizRewardService rewards,
        ObjectMapper json,
        @Value("${app.campus-quiz.session-ttl-minutes:60}") long ttlMinutes
    ) {
        if (ttlMinutes <= 0) {
            throw new IllegalArgumentException("Campus Quiz session TTL must be positive.");
        }
        this.courses = courses;
        this.questions = questions;
        this.sessions = sessions;
        this.rewards = rewards;
        this.json = json;
        this.sessionTtl = Duration.ofMinutes(ttlMinutes);
    }

    public List<CourseSummary> getAvailableCourses() {
        return courses.findByStatusOrderByDisplayOrderAscIdAsc(Course.Status.PUBLISHED).stream()
            .map(course -> new CourseSummary(course.getId(), course.getCode(), course.getName()))
            .toList();
    }

    public StartResponse startQuiz(long courseId, long studentId) {
        courses.findByIdAndStatus(courseId, Course.Status.PUBLISHED).orElseThrow(() ->
            new QuizException(HttpStatus.BAD_REQUEST, "COURSE_UNAVAILABLE", "Khóa học không khả dụng.", null));

        var valid = new ArrayList<QuestionSnapshot>();
        var seenQuestionIds = new HashSet<Long>();
        for (var candidate : questions.findEligibleQuestionsByCourseId(courseId)) {
            normalizeQuestion(candidate)
                .filter(snapshot -> seenQuestionIds.add(snapshot.question().id()))
                .ifPresent(valid::add);
        }
        if (valid.size() < QUESTION_COUNT) {
            throw new QuizException(HttpStatus.BAD_REQUEST, "INSUFFICIENT_QUESTIONS",
                INSUFFICIENT_QUESTIONS_MESSAGE, valid.size());
        }

        Collections.shuffle(valid);
        Instant startedAt = Instant.now();
        var session = sessions.create(studentId, courseId, startedAt.plus(sessionTtl),
            valid.subList(0, QUESTION_COUNT));
        return new StartResponse(session.id(), startedAt, session.expiresAt(),
            session.questions().stream().map(QuestionSnapshot::question).toList());
    }

    public QuizResult submitQuiz(long studentId, SubmitRequest request) {
        var answers = new HashMap<Long, Integer>();
        for (var answer : request.answers()) {
            if (answers.putIfAbsent(answer.questionId(), answer.optionId()) != null) {
                throw new QuizException(HttpStatus.BAD_REQUEST, "INVALID_ANSWERS",
                    "Mỗi câu hỏi chỉ được nộp một đáp án.", null);
            }
        }
        var submission = sessions.claim(request.sessionId(), studentId, answers, request.mode());
        if (submission.result() != null) {
            return submission.result();
        }

        boolean completed = false;
        try {
            var questionResults = submission.session().questions().stream()
                .map(snapshot -> new QuestionResult(snapshot.question().id(),
                    submission.answers().get(snapshot.question().id()), snapshot.correctOptionId(),
                    snapshot.explanation()))
                .toList();
            int correctCount = (int) questionResults.stream()
                .filter(result -> Integer.valueOf(result.correctOptionId()).equals(result.selectedOptionId()))
                .count();
            boolean passed = correctCount >= PASSING_COUNT;
            long coinAwarded = passed ? awardQuizCoins(submission.session()) : 0;
            var result = new QuizResult(request.sessionId(), correctCount, QUESTION_COUNT, passed,
                coinAwarded, passed, questionResults);
            sessions.complete(request.sessionId(), result);
            completed = true;
            return result;
        } finally {
            if (!completed) {
                sessions.releaseForRetry(request.sessionId());
            }
        }
    }

    private long awardQuizCoins(CampusQuizSessionStore.Session session) {
        try {
            return rewards.awardCoins(session);
        } catch (RuntimeException ex) {
            log.error("Could not award Campus Quiz coins for session {}", session.id(), ex);
            throw new QuizException(HttpStatus.INTERNAL_SERVER_ERROR, "COIN_REWARD_FAILED",
                "Chưa thể cộng xu. Vui lòng thử nộp lại.", null);
        }
    }

    private Optional<QuestionSnapshot> normalizeQuestion(Candidate candidate) {
        if (candidate.content() == null || candidate.content().isBlank() || candidate.answerData() == null) {
            return Optional.empty();
        }

        JsonNode root;
        try {
            root = json.readTree(candidate.answerData());
        } catch (JsonProcessingException ex) {
            return Optional.empty();
        }
        if (root == null || !root.isObject()) {
            return Optional.empty();
        }

        JsonNode choices = root.path("options");
        JsonNode answer = root.path("correctAnswer");
        if ((!choices.isArray() && !choices.isObject()) || choices.size() < 2
            || !answer.isTextual() || answer.asText().isBlank()) {
            return Optional.empty();
        }

        boolean keyedChoices = choices.isObject();
        String correctKey = keyedChoices ? answer.asText().trim() : QuestionBankService.key(answer.asText());
        var fields = choices.fields();
        var options = new ArrayList<Option>(choices.size());
        var seenTexts = new HashSet<String>();
        int correctOptionId = 0;
        for (int i = 0; i < choices.size(); i++) {
            var field = keyedChoices ? fields.next() : null;
            JsonNode choice = field == null ? choices.get(i) : field.getValue();
            if (!choice.isTextual()) {
                return Optional.empty();
            }
            String optionKey = QuestionBankService.key(choice.asText());
            if (optionKey.isBlank() || !seenTexts.add(optionKey)) {
                return Optional.empty();
            }
            int optionId = i + 1;
            options.add(new Option(optionId, choice.asText().trim()));
            if (correctKey.equals(field == null ? optionKey : field.getKey())) {
                correctOptionId = optionId;
            }
        }
        if (correctOptionId == 0) {
            return Optional.empty();
        }
        var question = new QuizQuestion(candidate.id(), candidate.content(), candidate.mediaUrl(), List.copyOf(options));
        return Optional.of(new QuestionSnapshot(question, correctOptionId, candidate.explanation()));
    }
}
