package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jtech.dto.request.QuestionBankRequest;
import com.jtech.dto.response.QuestionBankResponse;
import com.jtech.entity.Question;
import com.jtech.entity.User;
import com.jtech.repository.QuestionBankQueryRepository;
import com.jtech.repository.QuestionBankRepository;
import com.jtech.repository.UserRepository;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;


@Service
public class QuestionBankService {
    private static final List<String> GRAMMAR_KEYS = List.of("A", "B", "C", "D");
    private static final int MAX_ANSWER_LENGTH = 200;

    static final String NOT_FOUND = "Không tìm thấy câu hỏi.";
    static final Set<Question.Skill> BANK_SKILLS =
            Set.of(Question.Skill.VOCABULARY, Question.Skill.KANJI, Question.Skill.GRAMMAR);
    static final String UNSUPPORTED_SKILL = "Ngân hàng câu hỏi chỉ quản lý câu hỏi Từ vựng, Kanji và Ngữ pháp.";
    static final String ANSWER_LOCKED = "Câu hỏi đã có học viên làm bài nên không thể thay đổi đáp án (BR-29). "
            + "Bạn vẫn có thể sửa nội dung, giải thích và độ khó.";

    record Answer(List<String> options, String correctAnswer, Map<String, String> matches) {
    }

    private final QuestionBankRepository questions;
    private final QuestionBankQueryRepository queries;
    private final UserRepository users;
    private final ObjectMapper json;

    public QuestionBankService(QuestionBankRepository questions, QuestionBankQueryRepository queries,
            UserRepository users, ObjectMapper json) {
        this.questions = questions;
        this.queries = queries;
        this.users = users;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public QuestionBankResponse.Page search(QuestionBankQueryRepository.Filter filter, int page, int size) {
        return queries.search(filter, Math.max(page, 0), Math.min(Math.max(size, 1), 100));
    }

    @Transactional(readOnly = true)
    public QuestionBankResponse.Targets targets() {
        return queries.targets();
    }

    @Transactional(readOnly = true)
    public QuestionBankResponse.Detail detail(long id) {
        Question q = find(id);
        QuestionBankResponse.Summary summary = queries.findSummary(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
        Answer answer = readAnswer(q);
        boolean attempted = queries.hasAttempts(id);
        String reason = retentionReason(q, attempted);
        return new QuestionBankResponse.Detail(summary, q.getGrammarId(), q.getExplanation(), answer.options(),
                answer.correctAnswer(), answer.matches(), attempted, reason == null, reason,
                queries.linkedTests(id));
    }

    @Transactional
    public QuestionBankResponse.Detail create(QuestionBankRequest request, String moderatorEmail) {
        if (!BANK_SKILLS.contains(request.skill())) throw badRequest(UNSUPPORTED_SKILL);
        User moderator = findModerator(moderatorEmail);
        Answer answer = validateAnswer(request.skill(), request.questionType(), request);

        Question q = new Question();
        q.setSkill(request.skill());
        q.setQuestionType(request.questionType());
        applyTarget(q, request);
        q.setContent(request.content().trim());
        q.setExplanation(trimToNull(request.explanation()));
        q.setDifficulty(request.difficulty());
        q.setIsExerciseQuestion(exerciseFlag(request));
        q.setDisplayOrder(0);
        q.setAnswerData(writeAnswer(request.skill(), request.questionType(), answer, null));
        q.setStatus(Question.QuestionStatus.ACTIVE);
        q.setCreatedBy(moderator.getUserId());
        q.setCreatedAt(LocalDateTime.now());
        Question saved = questions.save(q);
        return detail(saved.getId());
    }

    @Transactional
    public QuestionBankResponse.Detail update(long id, QuestionBankRequest request, String moderatorEmail) {
        Question q = find(id);
        if (request.skill() != q.getSkill()) throw badRequest("Không thể đổi kỹ năng của câu hỏi đã tạo.");
        if (q.getStatus() == Question.QuestionStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Câu hỏi đã được lưu trữ, không thể chỉnh sửa.");
        }
        User moderator = findModerator(moderatorEmail);
        Answer answer = validateAnswer(q.getSkill(), request.questionType(), request);
        boolean answerChanged = request.questionType() != q.getQuestionType() || !sameAnswer(readAnswer(q), answer);
        if (answerChanged && queries.hasAttempts(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, ANSWER_LOCKED);
        }
        applyTarget(q, request);
        q.setContent(request.content().trim());
        q.setExplanation(trimToNull(request.explanation()));
        q.setDifficulty(request.difficulty());
        if (answerChanged) {
            q.setAnswerData(writeAnswer(q.getSkill(), request.questionType(), answer, q.getAnswerData()));
            q.setQuestionType(request.questionType());
        }
        q.setUpdatedBy(moderator.getUserId());
        q.setUpdatedAt(LocalDateTime.now());
        questions.saveAndFlush(q);
        return detail(id);
    }

    
    @Transactional
    public QuestionBankResponse.DeleteResult delete(long id, String moderatorEmail) {
        Question q = find(id);
        User moderator = findModerator(moderatorEmail);
        String reason = retentionReason(q, queries.hasAttempts(id));
        if (reason != null) {
            markArchived(q, moderator);
            return new QuestionBankResponse.DeleteResult(id, true, reason);
        }
        questions.delete(q);
        questions.flush();
        return new QuestionBankResponse.DeleteResult(id, false, null);
    }

    @Transactional
    public QuestionBankResponse.DeleteResult archive(long id, String moderatorEmail) {
        Question q = find(id);
        markArchived(q, findModerator(moderatorEmail));
        return new QuestionBankResponse.DeleteResult(id, true, null);
    }

    private void markArchived(Question q, User moderator) {
        if (q.getStatus() == Question.QuestionStatus.ARCHIVED) return;
        q.setStatus(Question.QuestionStatus.ARCHIVED);
        q.setUpdatedBy(moderator.getUserId());
        q.setUpdatedAt(LocalDateTime.now());
        questions.save(q);
    }

    private Question find(long id) {
        return questions.findById(id).filter(q -> BANK_SKILLS.contains(q.getSkill()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, NOT_FOUND));
    }

    private User findModerator(String email) {
        return users.findByEmail(email)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Không tìm thấy tài khoản đăng nhập."));
    }

    
    static boolean exerciseFlag(QuestionBankRequest request) {
        return false;
    }

    private String retentionReason(Question q, boolean attempted) {
        if (attempted) return "Câu hỏi đã có học viên làm bài.";
        if (queries.isInTest(q.getId())) return "Câu hỏi đang thuộc một bài kiểm tra.";
        if (queries.hasFeedback(q.getId())) return "Câu hỏi có phản hồi của học viên.";
        return null;
    }

    private void applyTarget(Question q, QuestionBankRequest r) {
        q.setLessonId(null);
        q.setGrammarId(null);
        switch (q.getSkill()) {
            case VOCABULARY, KANJI -> {
                if (r.lessonId() == null) throw badRequest("Vui lòng chọn bài học.");
                String skill = queries.findLessonSkill(r.lessonId())
                        .orElseThrow(() -> badRequest("Bài học không tồn tại."));
                if (!q.getSkill().name().equals(skill)) {
                    throw badRequest("Bài học đã chọn không thuộc kỹ năng " + label(q.getSkill()) + ".");
                }
                q.setLessonId(r.lessonId());
            }
            case GRAMMAR -> {
                if (r.grammarId() == null) throw badRequest("Vui lòng chọn điểm ngữ pháp.");
                Long lesson = queries.findGrammarLesson(r.grammarId())
                        .orElseThrow(() -> badRequest("Điểm ngữ pháp không tồn tại."));
                q.setGrammarId(r.grammarId());
                q.setLessonId(lesson);
            }
            default -> throw badRequest(UNSUPPORTED_SKILL);
        }
    }

    Answer validateAnswer(Question.Skill skill, Question.QuestionType type, QuestionBankRequest r) {
        return switch (type) {
            case MCQ -> {
                List<String> options = r.options() == null ? List.of()
                        : r.options().stream().map(o -> o == null ? "" : o.trim()).toList();
                boolean grammar = skill == Question.Skill.GRAMMAR;
                if (grammar ? options.size() != 4 : options.size() < 2 || options.size() > 6) {
                    throw badRequest(grammar ? "Câu trắc nghiệm Ngữ pháp cần đủ 4 lựa chọn A–D."
                            : "Câu trắc nghiệm cần từ 2 đến 6 lựa chọn.");
                }
                Set<String> seen = new HashSet<>();
                for (String option : options) {
                    if (option.isEmpty()) throw badRequest("Lựa chọn không được để trống.");
                    if (option.length() > MAX_ANSWER_LENGTH) throw badRequest("Mỗi lựa chọn tối đa 200 ký tự.");
                    if (!seen.add(key(option))) throw badRequest("Các lựa chọn không được trùng nhau.");
                }
                String correct = options.stream().filter(o -> key(o).equals(key(r.correctAnswer()))).findFirst()
                        .orElseThrow(() -> badRequest("Vui lòng chọn đáp án đúng trong các lựa chọn."));
                yield new Answer(options, correct, Map.of());
            }
            case FILL_IN -> {
                String correct = r.correctAnswer() == null ? "" : r.correctAnswer().trim();
                if (correct.isEmpty()) throw badRequest("Câu điền đáp án phải có đáp án đúng.");
                if (correct.length() > MAX_ANSWER_LENGTH) throw badRequest("Đáp án tối đa 200 ký tự.");
                yield new Answer(List.of(), correct, Map.of());
            }
            case MATCHING -> {
                Map<String, String> pairs = r.matches() == null ? Map.of() : r.matches();
                if (pairs.size() < 2 || pairs.size() > 10) throw badRequest("Câu nối cần từ 2 đến 10 cặp.");
                Map<String, String> trimmed = new LinkedHashMap<>();
                Set<String> lefts = new HashSet<>();
                Set<String> rights = new HashSet<>();
                for (var entry : pairs.entrySet()) {
                    String left = entry.getKey() == null ? "" : entry.getKey().trim();
                    String right = entry.getValue() == null ? "" : entry.getValue().trim();
                    if (left.isEmpty() || right.isEmpty()) throw badRequest("Mỗi cặp nối phải có đủ hai vế.");
                    if (left.length() > MAX_ANSWER_LENGTH || right.length() > MAX_ANSWER_LENGTH) {
                        throw badRequest("Mỗi vế tối đa 200 ký tự.");
                    }
                    if (!lefts.add(key(left)) || !rights.add(key(right))) {
                        throw badRequest("Các vế trong câu nối không được trùng nhau.");
                    }
                    trimmed.put(left, right);
                }
                yield new Answer(List.of(), "", trimmed);
            }
        };
    }

    String writeAnswer(Question.Skill skill, Question.QuestionType type, Answer answer, String previous) {
        try {
            if (skill == Question.Skill.GRAMMAR && type == Question.QuestionType.MCQ) {
                ObjectNode root = json.createObjectNode();
                ObjectNode options = root.putObject("options");
                String correct = null;
                for (int i = 0; i < GRAMMAR_KEYS.size(); i++) {
                    options.put(GRAMMAR_KEYS.get(i), answer.options().get(i));
                    if (answer.options().get(i).equals(answer.correctAnswer())) correct = GRAMMAR_KEYS.get(i);
                }
                root.put("correctAnswer", correct);
                return json.writeValueAsString(root);
            }
            ObjectNode root = json.createObjectNode();
            if (previous != null) {
                JsonNode old = json.readTree(previous);
                if (old != null && old.isObject() && !old.path("options").isObject()) root = (ObjectNode) old;
            }
            root.set("options", json.valueToTree(answer.options()));
            root.put("correctAnswer", answer.correctAnswer());
            root.set("matches", json.valueToTree(answer.matches()));
            return json.writeValueAsString(root);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể lưu đáp án câu hỏi.", ex);
        }
    }

    Answer readAnswer(Question q) {
        try {
            JsonNode root = q.getAnswerData() == null ? null : json.readTree(q.getAnswerData());
            if (root == null || !root.isObject()) return new Answer(List.of(), "", Map.of());
            List<String> options = new ArrayList<>();
            JsonNode optionNode = root.path("options");
            String correct = root.path("correctAnswer").asText("");
            if (optionNode.isArray()) {
                optionNode.forEach(o -> options.add(o.asText()));
            } else if (optionNode.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = optionNode.fields();
                String correctText = correct;
                while (fields.hasNext()) {
                    var field = fields.next();
                    options.add(field.getValue().asText());
                    if (field.getKey().equals(correct)) correctText = field.getValue().asText();
                }
                correct = correctText;
            }
            Map<String, String> matches = new LinkedHashMap<>();
            JsonNode matchNode = root.path("matches");
            if (matchNode.isObject()) matchNode.fields().forEachRemaining(e -> matches.put(e.getKey(), e.getValue().asText()));
            return new Answer(options, correct, matches);
        } catch (JsonProcessingException ex) {
            return new Answer(List.of(), "", Map.of());
        }
    }

    static boolean sameAnswer(Answer a, Answer b) {
        return a.options().stream().map(QuestionBankService::key).toList()
                .equals(b.options().stream().map(QuestionBankService::key).toList())
                && key(a.correctAnswer()).equals(key(b.correctAnswer()))
                && normalizeMap(a.matches()).equals(normalizeMap(b.matches()));
    }

    private static Map<String, String> normalizeMap(Map<String, String> map) {
        Map<String, String> out = new LinkedHashMap<>();
        map.forEach((k, v) -> out.put(key(k), key(v)));
        return out;
    }

    static String key(String value) {
        return value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFKC).trim().toLowerCase(Locale.ROOT);
    }

    private static String label(Question.Skill skill) {
        return switch (skill) {
            case VOCABULARY -> "Từ vựng";
            case KANJI -> "Kanji";
            case GRAMMAR -> "Ngữ pháp";
            default -> skill.name();
        };
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
