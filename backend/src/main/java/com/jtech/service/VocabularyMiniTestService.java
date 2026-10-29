package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.VocabularyMiniTestRequest;
import com.jtech.dto.request.VocabularyMiniTestGenerateRequest;
import com.jtech.dto.response.VocabularyMiniTestResponse;
import com.jtech.entity.*;
import com.jtech.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class VocabularyMiniTestService {
    public record AnswerData(List<String> options, String correctAnswer, Map<String, String> matches, Long sourceVocabularyId) {
        public AnswerData(List<String> options, String answer, Map<String, String> matches) { this(options, answer, matches, null); }
    }
    private final VocabularyMiniTestRepository tests;
    private final VocabularyMiniTestQuestionRepository questions;
    private final VocabularyMiniTestLinkRepository links;
    private final VocabularyService vocabulary;
    private final ObjectMapper json;
    private final VocabularyRepository words;

    public VocabularyMiniTestService(VocabularyMiniTestRepository tests, VocabularyMiniTestQuestionRepository questions,
            VocabularyMiniTestLinkRepository links, VocabularyService vocabulary, ObjectMapper json, VocabularyRepository words) {
        this.tests = tests; this.questions = questions; this.links = links; this.vocabulary = vocabulary; this.json = json;
        this.words = words;
    }

    public List<VocabularyMiniTestResponse> list(Long lessonId, Authentication authentication) {
        vocabulary.checkLesson(lessonId, authentication);
        return tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(lessonId, VocabularyMiniTest.Type.MINI_TEST, VocabularyMiniTest.Skill.VOCABULARY)
                .stream().map(test -> response(test, false)).toList();
    }

    public VocabularyMiniTestResponse get(Long id) { return response(requireTest(id, false), true); }

    @Transactional
    public VocabularyMiniTestResponse generate(Long lessonId, VocabularyMiniTestGenerateRequest settings, Authentication authentication) {
        vocabulary.lockLesson(lessonId, authentication);
        var existing = tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(lessonId, VocabularyMiniTest.Type.MINI_TEST, VocabularyMiniTest.Skill.VOCABULARY);
        if (existing.size() > 1) throw new IllegalStateException("Bài học đang có nhiều mini-test cũ. Cần xử lý dữ liệu cũ trước khi áp dụng một mini-test mỗi bài.");
        var source = words.findByLessonIdOrderByDisplayOrderAscIdAsc(lessonId).stream()
                .filter(word -> word.getStatus() == Course.Status.PUBLISHED || word.getStatus() == Course.Status.DRAFT).toList();
        if (source.isEmpty()) throw new IllegalArgumentException("Hãy gán từ vựng cho bài trước khi tạo mini-test.");
        if (settings.status() == VocabularyMiniTest.Status.PUBLISHED && source.stream().anyMatch(word -> word.getStatus() != Course.Status.PUBLISHED)) {
            throw new IllegalArgumentException("Hãy xuất bản toàn bộ từ vựng của bài trước khi xuất bản mini-test.");
        }
        var definitions = source.stream().map(Vocabulary::getMeaningVi).map(String::trim)
                .collect(java.util.stream.Collectors.toMap(VocabularyMiniTestService::normalize, value -> value, (first, second) -> first, LinkedHashMap::new));
        if (definitions.size() < 2) throw new IllegalArgumentException("Cần ít nhất hai định nghĩa khác nhau trong bài để tạo đáp án trắc nghiệm.");
        var inputs = new ArrayList<VocabularyMiniTestRequest.Question>();
        for (var word : source) {
            var distractors = new ArrayList<>(definitions.values().stream().filter(value -> !normalize(value).equals(normalize(word.getMeaningVi()))).toList());
            Collections.shuffle(distractors);
            var options = new ArrayList<>(distractors.subList(0, Math.min(3, distractors.size())));
            options.add(word.getMeaningVi().trim()); Collections.shuffle(options);
            inputs.add(new VocabularyMiniTestRequest.Question(VocabularyMiniTestQuestion.Type.MCQ,
                    "Chọn nghĩa đúng của từ: " + word.getWord() + (word.getReading() == null || word.getReading().isBlank() ? "" : " (" + word.getReading() + ")"),
                    word.getWord() + ": " + word.getMeaningVi(), VocabularyMiniTestQuestion.Difficulty.EASY,
                    options, word.getMeaningVi().trim(), Map.of(), word.getId()));
        }
        var request = new VocabularyMiniTestRequest(settings.title(), settings.description(), settings.durationMinutes(), settings.passingScore(), settings.status(), inputs);
        return existing.isEmpty() ? create(lessonId, request, authentication) : update(existing.getFirst().getId(), request);
    }

    @Transactional
    public VocabularyMiniTestResponse create(Long lessonId, VocabularyMiniTestRequest request, Authentication authentication) {
        vocabulary.checkLesson(lessonId, authentication);
        vocabulary.lockLesson(lessonId, authentication);
        if (!tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(lessonId, VocabularyMiniTest.Type.MINI_TEST, VocabularyMiniTest.Skill.VOCABULARY).isEmpty()) {
            throw new IllegalStateException("Mỗi bài học chỉ có một mini-test. Hãy cập nhật mini-test hiện có.");
        }
        validate(request);
        var test = new VocabularyMiniTest(); test.setLessonId(lessonId);
        apply(test, request); tests.saveAndFlush(test);
        saveQuestions(test, request.questions());
        return response(test, true);
    }

    @Transactional
    public VocabularyMiniTestResponse update(Long id, VocabularyMiniTestRequest request) {
        var test = requireTest(id, true);
        if (tests.countAttempts(id) > 0) {
            throw new IllegalStateException("Mini-test đã có lượt làm nên không thể tạo lại câu hỏi, để giữ nguyên nội dung và kết quả cũ.");
        }
        validate(request);
        var previousQuestions = questions.findForTest(id);
        links.removeForTest(id);
        // Questions shared with another test must keep their original content and status.
        for (var question : previousQuestions) {
            if (!links.existsByQuestionId(question.getId())) {
                question.setStatus(VocabularyMiniTestQuestion.Status.ARCHIVED); questions.save(question);
            }
        }
        apply(test, request); tests.save(test); saveQuestions(test, request.questions());
        return response(test, true);
    }

    @Transactional
    public void archive(Long id) {
        var test = requireTest(id, true);
        if (tests.countActiveAttempts(id) > 0) throw new IllegalStateException("Có học sinh đang làm bài. Vui lòng chờ hết lượt làm trước khi lưu trữ.");
        test.setStatus(VocabularyMiniTest.Status.ARCHIVED); tests.save(test);
    }

    public VocabularyMiniTestResponse.Result preview(Long id, Map<String, String> answers) {
        var test = requireTest(id, false);
        var items = questions.findForTest(id);
        return grade(test, items, answers);
    }

    VocabularyMiniTestResponse.Result grade(VocabularyMiniTest test, List<VocabularyMiniTestQuestion> items, Map<String, String> answers) {
        if (items.isEmpty()) throw new IllegalStateException("Mini-test chưa có câu hỏi.");
        Set<String> questionIds = new HashSet<>(); items.forEach(question -> questionIds.add(question.getId().toString()));
        if (answers == null || !questionIds.containsAll(answers.keySet())) throw new IllegalArgumentException("Câu trả lời không thuộc bài kiểm tra.");
        var results = new ArrayList<VocabularyMiniTestResponse.QuestionResult>();
        for (var question : items) {
            var data = readAnswer(question);
            String supplied = answers.get(question.getId().toString());
            boolean correct = matches(question.getQuestionType(), data, supplied);
            results.add(new VocabularyMiniTestResponse.QuestionResult(question.getId(), correct, data.correctAnswer(), data.matches(), question.getExplanation()));
        }
        int correctCount = (int) results.stream().filter(VocabularyMiniTestResponse.QuestionResult::correct).count();
        BigDecimal score = BigDecimal.valueOf(correctCount * 100L).divide(BigDecimal.valueOf(items.size()), 2, RoundingMode.HALF_UP);
        return new VocabularyMiniTestResponse.Result(score, correctCount, items.size(), score.compareTo(test.getPassingScore()) >= 0, results);
    }

    boolean matches(VocabularyMiniTestQuestion.Type type, AnswerData data, String supplied) {
        if (supplied == null || supplied.length() > 20000) return false;
        if (type != VocabularyMiniTestQuestion.Type.MATCHING) return normalize(supplied).equals(normalize(data.correctAnswer()));
        try {
            Map<String, String> submitted = json.readValue(supplied, new TypeReference<>() {});
            if (submitted == null || submitted.size() != data.matches().size()) return false;
            return data.matches().entrySet().stream().allMatch(pair -> normalize(pair.getValue()).equals(normalize(submitted.get(pair.getKey()))));
        } catch (JsonProcessingException | IllegalArgumentException ex) { return false; }
    }

    private void validate(VocabularyMiniTestRequest request) {
        if (request.questions() == null || request.questions().isEmpty()) throw new IllegalArgumentException("Mini-test phải có câu hỏi từ danh sách từ vựng của bài.");
        for (var question : request.questions()) validateAnswer(question);
    }

    AnswerData validateAnswer(VocabularyMiniTestRequest.Question question) {
        switch (question.questionType()) {
            case MCQ -> {
                var options = question.options() == null ? List.<String>of() : question.options().stream().map(String::trim).toList();
                if (options.size() < 2 || options.size() > 6 || options.stream().anyMatch(String::isBlank) || options.stream().map(VocabularyMiniTestService::normalize).distinct().count() != options.size()) {
                    throw new IllegalArgumentException("Câu trắc nghiệm cần 2–6 lựa chọn không trùng nhau.");
                }
                String answer = options.stream().filter(option -> normalize(option).equals(normalize(question.correctAnswer()))).findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Hãy chọn một đáp án đúng trong các lựa chọn."));
                return new AnswerData(options, answer, Map.of(), question.sourceVocabularyId());
            }
            case FILL_IN -> {
                if (question.correctAnswer() == null || question.correctAnswer().isBlank()) throw new IllegalArgumentException("Câu điền từ cần đáp án đúng.");
                return new AnswerData(List.of(), question.correctAnswer().trim(), Map.of());
            }
            case MATCHING -> {
                Map<String, String> pairs = question.matches();
                if (pairs == null || pairs.size() < 2 || pairs.size() > 10 || pairs.entrySet().stream().anyMatch(pair -> pair.getKey() == null || pair.getKey().isBlank() || pair.getValue() == null || pair.getValue().isBlank()) ||
                        pairs.keySet().stream().map(VocabularyMiniTestService::normalize).distinct().count() != pairs.size() ||
                        pairs.values().stream().map(VocabularyMiniTestService::normalize).distinct().count() != pairs.size()) {
                    throw new IllegalArgumentException("Câu nối cặp cần 2–10 cặp, các vế không được trùng hoặc để trống.");
                }
                var trimmed = new LinkedHashMap<String, String>(); pairs.forEach((left, right) -> trimmed.put(left.trim(), right.trim()));
                return new AnswerData(List.of(), "", trimmed);
            }
            default -> throw new IllegalArgumentException("Dạng câu hỏi không hợp lệ.");
        }
    }

    private void apply(VocabularyMiniTest test, VocabularyMiniTestRequest request) {
        test.setTitle(request.title().trim()); test.setDescription(request.description() == null ? null : request.description().trim());
        test.setDurationMinutes(request.durationMinutes()); test.setPassingScore(request.passingScore()); test.setStatus(request.status());
    }

    private void saveQuestions(VocabularyMiniTest test, List<VocabularyMiniTestRequest.Question> inputs) {
        for (int index = 0; index < inputs.size(); index++) {
            var input = inputs.get(index); var question = new VocabularyMiniTestQuestion();
            question.setLessonId(test.getLessonId()); question.setQuestionType(input.questionType()); question.setContent(input.content().trim());
            question.setExplanation(input.explanation() == null ? "" : input.explanation().trim()); question.setDifficulty(input.difficulty());
            question.setDisplayOrder(index + 1);
            try { question.setAnswerData(json.writeValueAsString(validateAnswer(input))); }
            catch (JsonProcessingException ex) { throw new IllegalStateException("Không thể lưu đáp án."); }
            questions.saveAndFlush(question);
            var link = new VocabularyMiniTestLink(); link.setTestId(test.getId()); link.setQuestionId(question.getId()); links.save(link);
        }
        links.flush();
    }

    private VocabularyMiniTest requireTest(Long id, boolean lock) {
        var test = (lock ? tests.findForUpdate(id) : tests.findById(id))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy mini-test."));
        if (test.getSkill() != VocabularyMiniTest.Skill.VOCABULARY || test.getTestType() != VocabularyMiniTest.Type.MINI_TEST || test.getLessonId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy mini-test Vocab.");
        }
        return test;
    }

    VocabularyMiniTestResponse response(VocabularyMiniTest test, boolean detail) {
        List<VocabularyMiniTestResponse.Question> items = detail ? questions.findForTest(test.getId()).stream().map(question -> {
            var data = readAnswer(question);
            return new VocabularyMiniTestResponse.Question(question.getId(), question.getQuestionType(), question.getContent(), question.getExplanation(), question.getDifficulty(), data.options(), data.correctAnswer(), data.matches(), data.sourceVocabularyId());
        }).toList() : List.of();
        return new VocabularyMiniTestResponse(test.getId(), test.getLessonId(), test.getChapterId(), test.getTitle(), test.getDescription(), test.getDurationMinutes(), test.getPassingScore(), test.getStatus(), links.countByTestId(test.getId()), tests.countAttempts(test.getId()), items);
    }

    AnswerData readAnswer(VocabularyMiniTestQuestion question) {
        try {
            var data = json.readValue(question.getAnswerData(), AnswerData.class);
            if (data == null || data.options() == null || data.matches() == null || data.correctAnswer() == null) throw new IllegalArgumentException();
            return data;
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new IllegalStateException("Đáp án câu " + question.getId() + " chưa đúng định dạng mini-test Vocab.");
        }
    }

    static String normalize(String value) {
        return value == null ? "" : Normalizer.normalize(value, Normalizer.Form.NFKC).trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }
}
