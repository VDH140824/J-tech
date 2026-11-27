package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.VocabularyExerciseGenerateRequest;
import com.jtech.dto.request.VocabularyExerciseRequest;
import com.jtech.dto.request.VocabularyExerciseQuestionBankRequest;
import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.dto.response.StudentVocabularyExercise;
import com.jtech.entity.*;
import com.jtech.repository.*;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
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
        if (existing.isEmpty()) return create(lessonId, request, authentication);

        VocabularyTest latest = existing.getFirst();
        if (tests.countActiveAttempts(latest.getId()) > 0) {
            throw new IllegalStateException("Có học sinh đang làm exercise. Vui lòng chờ các lượt làm kết thúc rồi thử lại.");
        }
        if (tests.countAttempts(latest.getId()) > 0) {
            validate(request);
            latest.setStatus(VocabularyTest.Status.ARCHIVED);
            tests.saveAndFlush(latest);

            VocabularyTest nextVersion = new VocabularyTest();
            nextVersion.setLessonId(lessonId);
            apply(nextVersion, request);
            tests.saveAndFlush(nextVersion);
            saveQuestions(nextVersion, request.questions());
            return response(nextVersion, true);
        }
        return update(latest.getId(), request);
    }

    @Transactional
    public VocabularyTestResponse addQuestionBankItems(
        Long lessonId,
        VocabularyExerciseQuestionBankRequest request,
        Authentication authentication
    ) {
        vocabulary.checkLesson(lessonId, authentication);
        vocabulary.lockLesson(lessonId, authentication);
        var ids = new LinkedHashSet<>(request.questionIds());
        if (ids.size() != request.questionIds().size()) {
            throw new IllegalArgumentException("Không chọn trùng câu hỏi.");
        }

        var selected = questions.findAllById(ids);
        if (selected.size() != ids.size() || selected.stream().anyMatch(question ->
            !Objects.equals(question.getLessonId(), lessonId)
                || question.getSkill() != VocabularyTestQuestion.Skill.VOCABULARY
                || !Boolean.TRUE.equals(question.getExerciseQuestion())
                || question.getStatus() != VocabularyTestQuestion.Status.ACTIVE
        )) {
            throw new IllegalArgumentException("Chỉ có thể thêm câu Từ vựng đang dùng, được đánh dấu Exercise và thuộc đúng bài học.");
        }

        var current = tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
            lessonId, VocabularyTest.Type.EXERCISE, VocabularyTest.Skill.VOCABULARY
        );
        VocabularyTest target;
        if (current.isEmpty()) {
            target = new VocabularyTest();
            target.setLessonId(lessonId);
            apply(target, request);
            tests.saveAndFlush(target);
        } else {
            var latest = current.getFirst();
            if (tests.countActiveAttempts(latest.getId()) > 0) {
                throw new IllegalStateException("Có học sinh đang làm exercise. Vui lòng chờ các lượt làm kết thúc rồi thử lại.");
            }
            if (tests.countAttempts(latest.getId()) > 0) {
                target = new VocabularyTest();
                target.setLessonId(lessonId);
                apply(target, request);
                tests.saveAndFlush(target);
                for (var oldQuestion : questions.findForTest(latest.getId())) {
                    linkQuestion(target, oldQuestion.getId());
                }
            } else {
                target = latest;
                apply(target, request);
                tests.save(target);
            }
        }

        var linkedIds = questions.findForTest(target.getId()).stream()
            .map(VocabularyTestQuestion::getId).collect(java.util.stream.Collectors.toSet());
        for (var id : ids) {
            if (!linkedIds.contains(id)) linkQuestion(target, id);
        }
        links.flush();
        return response(target, true);
    }

    @Transactional
    public VocabularyTestResponse importQuestions(Long lessonId, MultipartFile file, Authentication authentication) {
        if (file == null || file.isEmpty() || file.getSize() > 5L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn file Excel có dữ liệu và không quá 5 MB.");
        }
        vocabulary.checkLesson(lessonId, authentication);
        List<VocabularyExerciseRequest.Question> imported = readVocabularyQuestions(file);
        var existing = tests.findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
            lessonId, VocabularyTest.Type.EXERCISE, VocabularyTest.Skill.VOCABULARY
        );
        // The repository orders newest first. Import into the newest exercise without
        // deleting legacy exercise records or their attempt history.
        VocabularyTest current = existing.isEmpty() ? null : existing.getFirst();
        var request = new VocabularyExerciseRequest(
            current == null ? "Exercise từ vựng" : current.getTitle(),
            current == null ? "Chọn đáp án đúng cho mỗi câu hỏi." : current.getDescription(),
            current == null ? 10 : current.getDurationMinutes(),
            current == null ? BigDecimal.valueOf(70) : current.getPassingScore(),
            current == null ? VocabularyTest.Status.DRAFT : current.getStatus(),
            imported
        );
        return saveReviewed(lessonId, request, authentication);
    }

    private List<VocabularyExerciseRequest.Question> readVocabularyQuestions(MultipartFile file) {
        List<String> expected = List.of("STT", "Nội dung câu hỏi", "A", "B", "C", "D", "Đáp án đúng", "Giải thích", "Độ khó");
        try (var workbook = new XSSFWorkbook(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) throw importError("File Excel không có sheet câu hỏi.");
            var sheet = workbook.getSheetAt(0);
            if (sheet.getLastRowNum() >= 10_000) throw importError("Sheet không được vượt quá 10.000 dòng.");
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            Row header = sheet.getRow(1);
            if (header == null) throw importError("Không tìm thấy dòng tiêu đề ở dòng 2 của mẫu.");
            for (int column = 0; column < expected.size(); column++) {
                if (!normalize(formatter.formatCellValue(header.getCell(column))).equals(normalize(expected.get(column)))) {
                    throw importError("Cột " + expected.get(column) + " không đúng mẫu Form_question.xlsx.");
                }
            }
            var result = new ArrayList<VocabularyExerciseRequest.Question>();
            for (int rowIndex = 2; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;
                String[] value = new String[9];
                boolean hasData = false;
                for (int column = 0; column < value.length; column++) {
                    var cell = row.getCell(column);
                    if (cell != null && (cell.getCellType() == CellType.FORMULA || cell.getCellType() == CellType.ERROR)) {
                        throw importError("Dòng " + (rowIndex + 1) + " không được chứa công thức hoặc ô lỗi.");
                    }
                    value[column] = cell == null ? "" : formatter.formatCellValue(cell).trim();
                    if (column > 0 && !value[column].isBlank()) hasData = true;
                }
                for (int column = value.length; column < row.getLastCellNum(); column++) {
                    if (!formatter.formatCellValue(row.getCell(column)).isBlank()) {
                        throw importError("Dòng " + (rowIndex + 1) + " có dữ liệu ngoài 9 cột của mẫu.");
                    }
                }
                if (!hasData) continue;
                if (result.size() >= 500) throw importError("Mỗi lần chỉ nhập tối đa 500 câu hỏi.");
                for (int column = 1; column <= 5; column++) {
                    if (value[column].isBlank() || value[column].length() > 100) {
                        throw importError("Dòng " + (rowIndex + 1) + ": nội dung và các đáp án A–D phải có tối đa 100 ký tự.");
                    }
                }
                if (value[7].length() > 10000) throw importError("Dòng " + (rowIndex + 1) + ": giải thích quá dài.");
                int answerIndex = switch (value[6].trim().toUpperCase(Locale.ROOT)) {
                    case "A" -> 0; case "B" -> 1; case "C" -> 2; case "D" -> 3;
                    default -> throw importError("Dòng " + (rowIndex + 1) + ": đáp án đúng phải là A, B, C hoặc D.");
                };
                VocabularyTestQuestion.Difficulty difficulty = switch (normalize(value[8])) {
                    case "dễ", "easy" -> VocabularyTestQuestion.Difficulty.EASY;
                    case "trung bình", "medium" -> VocabularyTestQuestion.Difficulty.MEDIUM;
                    case "khó", "hard" -> VocabularyTestQuestion.Difficulty.HARD;
                    default -> throw importError("Dòng " + (rowIndex + 1) + ": độ khó phải là Dễ, Trung bình hoặc Khó.");
                };
                String answer = value[2 + answerIndex];
                result.add(new VocabularyExerciseRequest.Question(
                    VocabularyTestQuestion.Type.MCQ, value[1], value[7], difficulty,
                    List.of(value[2], value[3], value[4], value[5]), answer, Map.of(), null
                ));
            }
            if (result.isEmpty()) throw importError("File Excel chưa có câu hỏi để nhập.");
            return List.copyOf(result);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            if (exception instanceof ResponseStatusException response) throw response;
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không đọc được file .xlsx theo mẫu Form_question.xlsx.", exception);
        }
    }

    private ResponseStatusException importError(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
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
            if (!links.existsByQuestionId(question.getId()) && !Boolean.TRUE.equals(question.getExerciseQuestion())) {
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
            "Exercise phải có ít nhất một câu hỏi."
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

    private void apply(VocabularyTest test, VocabularyExerciseQuestionBankRequest request) {
        test.setTitle(request.title().trim());
        test.setDescription(request.description() == null ? null : request.description().trim());
        test.setDurationMinutes(request.durationMinutes());
        test.setPassingScore(request.passingScore());
        test.setStatus(request.status());
    }

    private void linkQuestion(VocabularyTest test, Long questionId) {
        var link = new VocabularyTestQuestionLink();
        link.setTestId(test.getId());
        link.setQuestionId(questionId);
        links.save(link);
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
                data.correctAnswer() == null
            ) throw new IllegalArgumentException();
            return data.matches() == null
                ? new AnswerData(data.options(), data.correctAnswer(), Map.of(), data.sourceVocabularyId())
                : data;
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
