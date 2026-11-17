package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.VocabularyExerciseGenerateRequest;
import com.jtech.dto.request.VocabularyExerciseRequest;
import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.dto.response.StudentVocabularyExercise;
import com.jtech.entity.*;
import com.jtech.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class VocabularyExerciseService {

    public record AnswerData(
        List<String> options,
        String correctAnswer,
        Map<String, String> matches,
        Long sourceVocabularyId
    ) {
        public AnswerData(List<String> options, String answer, Map<String, String> matches) {
            this(options, answer, matches, null);
        }
    }

    private final VocabularyTestRepository tests;
    private final VocabularyTestQuestionRepository questions;
    private final VocabularyTestQuestionLinkRepository links;
    private final VocabularyService vocabulary;
    private final ObjectMapper json;
    private final VocabularyRepository words;

    public VocabularyExerciseService(
        VocabularyTestRepository tests,
        VocabularyTestQuestionRepository questions,
        VocabularyTestQuestionLinkRepository links,
        VocabularyService vocabulary,
        ObjectMapper json,
        VocabularyRepository words
    ) {
        this.tests = tests;
        this.questions = questions;
        this.links = links;
        this.vocabulary = vocabulary;
        this.json = json;
        this.words = words;
    }

    public List<VocabularyTestResponse> list(Long lessonId, Authentication authentication) {
        vocabulary.checkLesson(lessonId, authentication);
        return tests
            .findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
                lessonId,
                VocabularyTest.Type.EXERCISE,
                VocabularyTest.Skill.VOCABULARY
            )
            .stream()
            .map(test -> response(test, false))
            .toList();
    }

    public VocabularyTestResponse get(Long id) {
        return response(requireTest(id, false), true);
    }

    @Transactional
    public VocabularyTestResponse generate(
        Long lessonId,
        VocabularyExerciseGenerateRequest settings,
        Authentication authentication
    ) {
        vocabulary.lockLesson(lessonId, authentication);
        var existing = tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
            lessonId,
            VocabularyTest.Type.EXERCISE,
            VocabularyTest.Skill.VOCABULARY
        );
        if (existing.size() > 1) throw new IllegalStateException(
            "Bài học đang có nhiều exercise cũ. Cần xử lý dữ liệu cũ trước khi áp dụng một exercise mỗi bài."
        );
        if (settings.vocabularyIds() == null || settings.vocabularyIds().isEmpty()) {
            throw new IllegalArgumentException("Hãy chọn từ vựng để tạo exercise.");
        }
        var selectedIds = new HashSet<>(settings.vocabularyIds());
        var source = words
            .findByLessonIdOrderByDisplayOrderAscIdAsc(lessonId)
            .stream()
            .filter(word -> selectedIds.contains(word.getId()))
            .filter(
                word ->
                    word.getStatus() == Course.Status.PUBLISHED ||
                    word.getStatus() == Course.Status.DRAFT
            )
            .toList();
        if (source.size() != selectedIds.size()) throw new IllegalArgumentException(
            "Một số từ đã chọn không thuộc bài học hoặc không còn dùng được."
        );
        var definitions = source
            .stream()
            .map(Vocabulary::getMeaningVi)
            .map(String::trim)
            .collect(
                java.util.stream.Collectors.toMap(
                    VocabularyExerciseService::normalize,
                    value -> value,
                    (first, second) -> first,
                    LinkedHashMap::new
                )
            );
        if (definitions.size() < 2) throw new IllegalArgumentException(
            "Hãy chọn ít nhất hai từ có nghĩa khác nhau để tạo đáp án trắc nghiệm."
        );
        var inputs = new ArrayList<VocabularyExerciseRequest.Question>();
        for (var word : source) {
            var distractors = new ArrayList<>(
                definitions
                    .values()
                    .stream()
                    .filter(value -> !normalize(value).equals(normalize(word.getMeaningVi())))
                    .toList()
            );
            Collections.shuffle(distractors);
            var options = new ArrayList<>(distractors.subList(0, Math.min(3, distractors.size())));
            options.add(word.getMeaningVi().trim());
            Collections.shuffle(options);
            inputs.add(
                new VocabularyExerciseRequest.Question(
                    VocabularyTestQuestion.Type.MCQ,
                    "Chọn nghĩa đúng của từ: " +
                        word.getWord() +
                        (word.getReading() == null || word.getReading().isBlank()
                            ? ""
                            : " (" + word.getReading() + ")"),
                    word.getWord() + ": " + word.getMeaningVi(),
                    VocabularyTestQuestion.Difficulty.EASY,
                    options,
                    word.getMeaningVi().trim(),
                    Map.of(),
                    word.getId()
                )
            );
        }
        var request = new VocabularyExerciseRequest(
            settings.title(),
            settings.description(),
            settings.durationMinutes(),
            settings.passingScore(),
            settings.status(),
            inputs
        );
        return existing.isEmpty()
            ? create(lessonId, request, authentication)
            : update(existing.getFirst().getId(), request);
    }

    @Transactional
    public VocabularyTestResponse saveReviewed(
        Long lessonId,
        VocabularyExerciseRequest request,
        Authentication authentication
    ) {
        vocabulary.checkLesson(lessonId, authentication);
        vocabulary.lockLesson(lessonId, authentication);
        var existing = tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
            lessonId,
            VocabularyTest.Type.EXERCISE,
            VocabularyTest.Skill.VOCABULARY
        );
        if (existing.size() > 1) throw new IllegalStateException(
            "Bài học có nhiều exercise. Không thể xác định exercise cần cập nhật."
        );
        Set<Long> sourceIds = request.questions().stream()
            .map(VocabularyExerciseRequest.Question::sourceVocabularyId)
            .filter(Objects::nonNull)
            .collect(java.util.stream.Collectors.toSet());
        if (sourceIds.size() != request.questions().size()) {
            throw new IllegalArgumentException("Mỗi câu hỏi cần gắn với một từ vựng đã chọn.");
        }
        var sourceWords = words.findByLessonIdOrderByDisplayOrderAscIdAsc(lessonId).stream()
            .filter(word -> sourceIds.contains(word.getId()))
            .toList();
        if (sourceWords.size() != sourceIds.size() || sourceWords.stream().anyMatch(word ->
            word.getStatus() != Course.Status.PUBLISHED && word.getStatus() != Course.Status.DRAFT
        )) {
            throw new IllegalArgumentException("Từ vựng được chọn không còn thuộc bài học.");
        }
        return existing.isEmpty()
            ? create(lessonId, request, authentication)
            : update(existing.getFirst().getId(), request);
    }

    @Transactional
    public VocabularyTestResponse create(
        Long lessonId,
        VocabularyExerciseRequest request,
        Authentication authentication
    ) {
        vocabulary.checkLesson(lessonId, authentication);
        vocabulary.lockLesson(lessonId, authentication);
        if (
            !tests
                .findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
                    lessonId,
                    VocabularyTest.Type.EXERCISE,
                    VocabularyTest.Skill.VOCABULARY
                )
                .isEmpty()
        ) {
            throw new IllegalStateException(
                "Mỗi bài học chỉ có một exercise. Hãy cập nhật exercise hiện có."
            );
        }
        validate(request);
        var test = new VocabularyTest();
        test.setLessonId(lessonId);
        apply(test, request);
        tests.saveAndFlush(test);
        saveQuestions(test, request.questions());
        return response(test, true);
    }

    @Transactional
    public VocabularyTestResponse update(Long id, VocabularyExerciseRequest request) {
        var test = requireTest(id, true);
        if (tests.countAttempts(id) > 0) {
            throw new IllegalStateException(
                "Exercise đã có lượt làm nên không thể tạo lại câu hỏi, để giữ nguyên nội dung và kết quả cũ."
            );
        }
        validate(request);
        var previousQuestions = questions.findForTest(id);
        links.removeForTest(id);
        // Questions shared with another test must keep their original content and status.
        for (var question : previousQuestions) {
            if (!links.existsByQuestionId(question.getId())) {
                question.setStatus(VocabularyTestQuestion.Status.ARCHIVED);
                questions.save(question);
            }
        }
        apply(test, request);
        tests.save(test);
        saveQuestions(test, request.questions());
        return response(test, true);
    }

    @Transactional
    public void archive(Long id) {
        var test = requireTest(id, true);
        if (tests.countActiveAttempts(id) > 0) throw new IllegalStateException(
            "Có học sinh đang làm bài. Vui lòng chờ hết lượt làm trước khi lưu trữ."
        );
        test.setStatus(VocabularyTest.Status.ARCHIVED);
        tests.save(test);
    }

    public VocabularyTestResponse.Result preview(Long id, Map<String, String> answers) {
        var test = requireTest(id, false);
        var items = questions.findForTest(id);
        return grade(test, items, answers);
    }

    public StudentVocabularyExercise studentExercise(Long lessonId, Authentication authentication) {
        vocabulary.checkLesson(lessonId, authentication);
        var test = tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
                lessonId, VocabularyTest.Type.EXERCISE, VocabularyTest.Skill.VOCABULARY
            ).stream()
            .filter(item -> item.getStatus() == VocabularyTest.Status.PUBLISHED)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bài học chưa có exercise được xuất bản."));
        var items = questions.findForTest(test.getId()).stream().map(question -> {
            var data = readAnswer(question);
            return new StudentVocabularyExercise.Question(
                question.getId(), question.getQuestionType(), question.getContent(), data.options(),
                List.copyOf(data.matches().keySet()), data.matches().values().stream().distinct().sorted().toList()
            );
        }).toList();
        return new StudentVocabularyExercise(
            test.getId(), test.getTitle(), test.getDescription(), test.getDurationMinutes(), test.getPassingScore(), items
        );
    }

    public record GradedExercise(Long lessonId, VocabularyTestResponse.Result result) {}

    public GradedExercise submitExercise(
        Long id, List<Long> questionIds, Map<String, String> answers, Authentication authentication
    ) {
        var test = requireTest(id, false);
        if (test.getStatus() != VocabularyTest.Status.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Exercise chưa được xuất bản.");
        }
        vocabulary.checkLesson(test.getLessonId(), authentication);
        var items = questions.findForTest(id);
        if (!items.stream().map(VocabularyTestQuestion::getId).toList().equals(questionIds)) {
            throw new IllegalStateException("Exercise đã thay đổi. Vui lòng mở lại bài để làm đề mới.");
        }
        return new GradedExercise(test.getLessonId(), grade(test, items, answers));
    }

    VocabularyTestResponse.Result grade(
        VocabularyTest test,
        List<VocabularyTestQuestion> items,
        Map<String, String> answers
    ) {
        if (items.isEmpty()) throw new IllegalStateException("Exercise chưa có câu hỏi.");
        Set<String> questionIds = new HashSet<>();
        items.forEach(question -> questionIds.add(question.getId().toString()));
        if (
            answers == null || !questionIds.containsAll(answers.keySet())
        ) throw new IllegalArgumentException("Câu trả lời không thuộc bài kiểm tra.");
        var results = new ArrayList<VocabularyTestResponse.QuestionResult>();
        for (var question : items) {
            var data = readAnswer(question);
            String supplied = answers.get(question.getId().toString());
            boolean correct = matches(question.getQuestionType(), data, supplied);
            results.add(
                new VocabularyTestResponse.QuestionResult(
                    question.getId(),
                    correct,
                    data.correctAnswer(),
                    data.matches(),
                    question.getExplanation()
                )
            );
        }
        int correctCount = (int) results
            .stream()
            .filter(VocabularyTestResponse.QuestionResult::correct)
            .count();
        BigDecimal score = BigDecimal.valueOf(correctCount * 100L).divide(
            BigDecimal.valueOf(items.size()),
            2,
            RoundingMode.HALF_UP
        );
        return new VocabularyTestResponse.Result(
            score,
            correctCount,
            items.size(),
            score.compareTo(test.getPassingScore()) >= 0,
            results
        );
    }

    boolean matches(VocabularyTestQuestion.Type type, AnswerData data, String supplied) {
        if (supplied == null || supplied.length() > 20000) return false;
        if (type != VocabularyTestQuestion.Type.MATCHING) return normalize(supplied).equals(
            normalize(data.correctAnswer())
        );
        try {
            Map<String, String> submitted = json.readValue(supplied, new TypeReference<>() {});
            if (submitted == null || submitted.size() != data.matches().size()) return false;
            return data
                .matches()
                .entrySet()
                .stream()
                .allMatch(pair ->
                    normalize(pair.getValue()).equals(normalize(submitted.get(pair.getKey())))
                );
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            return false;
        }
    }

    private void validate(VocabularyExerciseRequest request) {
        if (
            request.questions() == null || request.questions().isEmpty()
        ) throw new IllegalArgumentException(
            "Exercise phải có câu hỏi từ danh sách từ vựng của bài."
        );
        for (var question : request.questions()) validateAnswer(question);
    }

    AnswerData validateAnswer(VocabularyExerciseRequest.Question question) {
        switch (question.questionType()) {
            case MCQ -> {
                var options =
                    question.options() == null
                        ? List.<String>of()
                        : question.options().stream().map(String::trim).toList();
                if (
                    options.size() < 2 ||
                    options.size() > 6 ||
                    options.stream().anyMatch(String::isBlank) ||
                    options.stream().map(VocabularyExerciseService::normalize).distinct().count() !=
                        options.size()
                ) {
                    throw new IllegalArgumentException(
                        "Câu trắc nghiệm cần 2–6 lựa chọn không trùng nhau."
                    );
                }
                String answer = options
                    .stream()
                    .filter(option -> normalize(option).equals(normalize(question.correctAnswer())))
                    .findFirst()
                    .orElseThrow(() ->
                        new IllegalArgumentException("Hãy chọn một đáp án đúng trong các lựa chọn.")
                    );
                return new AnswerData(options, answer, Map.of(), question.sourceVocabularyId());
            }
            case FILL_IN -> {
                if (
                    question.correctAnswer() == null || question.correctAnswer().isBlank()
                ) throw new IllegalArgumentException("Câu điền từ cần đáp án đúng.");
                return new AnswerData(List.of(), question.correctAnswer().trim(), Map.of());
            }
            case MATCHING -> {
                Map<String, String> pairs = question.matches();
                if (
                    pairs == null ||
                    pairs.size() < 2 ||
                    pairs.size() > 10 ||
                    pairs
                        .entrySet()
                        .stream()
                        .anyMatch(
                            pair ->
                                pair.getKey() == null ||
                                pair.getKey().isBlank() ||
                                pair.getValue() == null ||
                                pair.getValue().isBlank()
                        ) ||
                    pairs
                        .keySet()
                        .stream()
                        .map(VocabularyExerciseService::normalize)
                        .distinct()
                        .count() != pairs.size() ||
                    pairs
                        .values()
                        .stream()
                        .map(VocabularyExerciseService::normalize)
                        .distinct()
                        .count() != pairs.size()
                ) {
                    throw new IllegalArgumentException(
                        "Câu nối cặp cần 2–10 cặp, các vế không được trùng hoặc để trống."
                    );
                }
                var trimmed = new LinkedHashMap<String, String>();
                pairs.forEach((left, right) -> trimmed.put(left.trim(), right.trim()));
                return new AnswerData(List.of(), "", trimmed);
            }
            default -> throw new IllegalArgumentException("Dạng câu hỏi không hợp lệ.");
        }
    }

    private void apply(VocabularyTest test, VocabularyExerciseRequest request) {
        test.setTitle(request.title().trim());
        test.setDescription(request.description() == null ? null : request.description().trim());
        test.setDurationMinutes(request.durationMinutes());
        test.setPassingScore(request.passingScore());
        test.setStatus(request.status());
    }

    private void saveQuestions(
        VocabularyTest test,
        List<VocabularyExerciseRequest.Question> inputs
    ) {
        for (int index = 0; index < inputs.size(); index++) {
            var input = inputs.get(index);
            var question = new VocabularyTestQuestion();
            question.setLessonId(test.getLessonId());
            question.setQuestionType(input.questionType());
            question.setContent(input.content().trim());
            question.setExplanation(input.explanation() == null ? "" : input.explanation().trim());
            question.setDifficulty(input.difficulty());
            question.setDisplayOrder(index + 1);
            try {
                question.setAnswerData(json.writeValueAsString(validateAnswer(input)));
            } catch (JsonProcessingException ex) {
                throw new IllegalStateException("Không thể lưu đáp án.");
            }
            questions.saveAndFlush(question);
            var link = new VocabularyTestQuestionLink();
            link.setTestId(test.getId());
            link.setQuestionId(question.getId());
            links.save(link);
        }
        links.flush();
    }

    private VocabularyTest requireTest(Long id, boolean lock) {
        var test = (lock ? tests.findForUpdate(id) : tests.findById(id)).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy exercise.")
        );
        if (
            test.getSkill() != VocabularyTest.Skill.VOCABULARY ||
            test.getTestType() != VocabularyTest.Type.EXERCISE ||
            test.getLessonId() == null
        ) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Không tìm thấy exercise Vocab."
            );
        }
        return test;
    }

    VocabularyTestResponse response(VocabularyTest test, boolean detail) {
        List<VocabularyTestResponse.Question> items = detail
            ? questions
                  .findForTest(test.getId())
                  .stream()
                  .map(question -> {
                      var data = readAnswer(question);
                      return new VocabularyTestResponse.Question(
                          question.getId(),
                          question.getQuestionType(),
                          question.getContent(),
                          question.getExplanation(),
                          question.getDifficulty(),
                          data.options(),
                          data.correctAnswer(),
                          data.matches(),
                          data.sourceVocabularyId()
                      );
                  })
                  .toList()
            : List.of();
        return new VocabularyTestResponse(
            test.getId(),
            test.getLessonId(),
            test.getChapterId(),
            test.getTitle(),
            test.getDescription(),
            test.getDurationMinutes(),
            test.getPassingScore(),
            test.getStatus(),
            links.countByTestId(test.getId()),
            tests.countAttempts(test.getId()),
            items
        );
    }

    AnswerData readAnswer(VocabularyTestQuestion question) {
        try {
            var data = json.readValue(question.getAnswerData(), AnswerData.class);
            if (
                data == null ||
                data.options() == null ||
                data.matches() == null ||
                data.correctAnswer() == null
            ) throw new IllegalArgumentException();
            return data;
        } catch (JsonProcessingException | IllegalArgumentException ex) {
            throw new IllegalStateException(
                "Đáp án câu " + question.getId() + " chưa đúng định dạng exercise Vocab."
            );
        }
    }

    static String normalize(String value) {
        return value == null
            ? ""
            : Normalizer.normalize(value, Normalizer.Form.NFKC)
                  .trim()
                  .replaceAll("\\s+", " ")
                  .toLowerCase(Locale.ROOT);
    }
}
