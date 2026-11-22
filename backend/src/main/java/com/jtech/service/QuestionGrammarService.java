package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jtech.dto.request.QuestionGrammarCreateRequest;
import com.jtech.dto.request.QuestionGrammarUpdateRequest;
import com.jtech.dto.response.GrammarQuestionImportResponse.RowError;
import com.jtech.dto.response.GrammarQuestionImportResponse;
import com.jtech.dto.response.QuestionGrammarResponse;
import com.jtech.entity.Lesson;
import com.jtech.entity.Question;
import com.jtech.exception.GrammarQuestionImportException;
import com.jtech.repository.GrammarRepository;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.QuestionGrammarRepository;
import com.jtech.repository.UserRepository;

import java.io.IOException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class QuestionGrammarService {
    private static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    private static final int MAX_QUESTIONS = 500;
    private static final int MAX_SHEET_ROWS = 10_000;
    private static final List<String> COLUMNS = List.of(
            "STT", "Nội dung câu hỏi", "A", "B", "C", "D", "Đáp án đúng", "Giải thích", "Độ khó");
    private static final List<List<String>> HEADERS = List.of(
            List.of("stt", "question #"), List.of("noi dung cau hoi", "question text"),
            List.of("a"), List.of("b"), List.of("c"), List.of("d"),
            List.of("dap an dung", "correct answer", "correct answer(s)"),
            List.of("giai thich", "explanation", "explaination detail"),
            List.of("do kho", "difficulty"));

    private record QuestionRow(int excelRow, String content, Map<String, String> options,
                              String correctAnswer, String explanation, Question.Difficulty difficulty) {}

    private final QuestionGrammarRepository questionRepository;
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final GrammarRepository grammarRepository;
    private final ObjectMapper objectMapper;

    public QuestionGrammarService(QuestionGrammarRepository questionRepository,
                                  UserRepository userRepository,
                                  LessonRepository lessonRepository,
                                  GrammarRepository grammarRepository,
                                  ObjectMapper objectMapper) {
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.lessonRepository = lessonRepository;
        this.grammarRepository = grammarRepository;
        this.objectMapper = objectMapper;
    }

    // READ_COMMITTED ensures a waiting import sees the preceding import's committed MAX.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public GrammarQuestionImportResponse importGrammarQuestions(
            Long grammarId, MultipartFile file, String userEmail) {
        if (grammarId == null || grammarId < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID ngữ pháp phải là số nguyên dương.");
        }
        if (!grammarRepository.existsById(grammarId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ngữ pháp.");
        }
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found")).getUserId();
        var rows = readAndValidateExcel(file);
        // Acquire only after validation; all imports of this grammar use the same parent lock.
        var grammar = grammarRepository.findByIdForQuestionImport(grammarId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ngữ pháp."));
        var lesson = grammar.getLesson();
        if (lesson == null || lesson.getSkillType() != Lesson.SkillType.GRAMMAR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngữ pháp không thuộc bài học Grammar hợp lệ.");
        }
        int lastOrder = questionRepository.findMaxDisplayOrderByGrammarId(grammarId, Question.Skill.GRAMMAR);
        if ((long) lastOrder + rows.size() > 65535) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thứ tự hiển thị sau khi nhập vượt quá 65535. Chưa lưu câu hỏi nào.");
        }
        var questions = new ArrayList<Question>();
        var now = LocalDateTime.now();
        for (int i = 0; i < rows.size(); i++) {
            var row = rows.get(i);
            var answer = objectMapper.createObjectNode();
            answer.set("options", objectMapper.valueToTree(row.options()));
            answer.put("correctAnswer", row.correctAnswer());
            var question = new Question();
            question.setGrammarId(grammarId);
            question.setLessonId(lesson.getId());
            question.setSkill(Question.Skill.GRAMMAR);
            question.setQuestionType(Question.QuestionType.MCQ);
            question.setContent(row.content());
            question.setExplanation(row.explanation());
            question.setAnswerData(validateAnswerData(answer.toString(), Question.QuestionType.MCQ));
            question.setDifficulty(row.difficulty());
            question.setIsExerciseQuestion(true);
            question.setStatus(Question.QuestionStatus.ACTIVE);
            question.setDisplayOrder(lastOrder + i + 1);
            question.setCreatedBy(userId);
            question.setCreatedAt(now);
            questions.add(question);
        }
        questionRepository.saveAllAndFlush(questions);
        return new GrammarQuestionImportResponse(grammarId, questions.size(), "Nhập câu hỏi thành công.");
    }

    @Transactional(readOnly = true)
    public List<QuestionGrammarResponse> getAllGrammarQuestions(Long grammarId) {
        if (!grammarRepository.existsById(grammarId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Grammar not found");
        }
        return questionRepository.findByGrammarIdAndSkillAndStatusOrderByDisplayOrderAscIdAsc(
                grammarId, Question.Skill.GRAMMAR, Question.QuestionStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public QuestionGrammarResponse createQuestionGrammar(QuestionGrammarCreateRequest request, String userEmail) {
        Lesson lesson = lessonRepository.findById(request.lessonId())
                .orElseThrow(() -> new IllegalArgumentException("Lesson not found"));
        if (lesson.getSkillType() != Lesson.SkillType.GRAMMAR) {
            throw new IllegalArgumentException("Lesson is not a grammar lesson");
        }

        var grammar = grammarRepository.findById(request.grammarId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grammar not found"));
        if (!grammar.getLesson().getId().equals(lesson.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grammar does not belong to this lesson");
        }

        validateFields(request.content(), request.explanation(), request.displayOrder());
        String answerData = validateAnswerData(request.answerData(), request.questionType());
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found"))
                .getUserId();

        Question question = new Question();
        question.setSkill(Question.Skill.GRAMMAR);
        question.setQuestionType(request.questionType());
        question.setLessonId(lesson.getId());
        question.setGrammarId(grammar.getId());
        question.setContent(request.content().trim());
        question.setExplanation(request.explanation().trim());
        question.setAnswerData(answerData);
        question.setDifficulty(request.difficulty());
        question.setIsExerciseQuestion(request.isExerciseQuestion());
        question.setDisplayOrder(request.displayOrder());
        question.setStatus(Question.QuestionStatus.ACTIVE);
        question.setCreatedBy(userId);
        question.setCreatedAt(LocalDateTime.now());

        return toResponse(questionRepository.save(question));
    }

    @Transactional
    public QuestionGrammarResponse updateQuestionGrammar(Long id, QuestionGrammarUpdateRequest request, String userEmail) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found"));
        if (question.getSkill() != Question.Skill.GRAMMAR) {
            throw new IllegalArgumentException("Question is not a grammar question");
        }

        validateFields(request.content(), request.explanation(), request.displayOrder());
        String answerData = validateAnswerData(request.answerData(), request.questionType());
        Long userId = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new AccessDeniedException("User not found"))
                .getUserId();

        question.setQuestionType(request.questionType());
        question.setContent(request.content().trim());
        question.setExplanation(request.explanation().trim());
        question.setAnswerData(answerData);
        question.setDifficulty(request.difficulty());
        question.setDisplayOrder(request.displayOrder());
        question.setUpdatedBy(userId);
        question.setUpdatedAt(LocalDateTime.now());

        return toResponse(questionRepository.save(question));
    }

    @Transactional
    public void deleteQuestionGrammar(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Question not found"));
        if (question.getSkill() != Question.Skill.GRAMMAR) {
            throw new NoSuchElementException("Grammar question not found");
        }

        questionRepository.delete(question);
        questionRepository.flush();
    }

    private void validateFields(String content, String explanation, Integer displayOrder) {
        validateText(content, "Nội dung câu hỏi");
        validateText(explanation, "Giải thích");
        if (displayOrder == null || displayOrder < 1 || displayOrder > 65535) {
            throw new IllegalArgumentException("Thứ tự hiển thị phải là số nguyên từ 1 đến 65535");
        }
    }

    private void validateText(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " không được để trống");
        }
        if (value.trim().length() > 100) {
            throw new IllegalArgumentException(label + " không được vượt quá 100 ký tự");
        }
    }

    private String validateAnswerData(String answerData, Question.QuestionType questionType) {
        if (answerData == null || answerData.isBlank()) {
            throw new IllegalArgumentException("Đáp án không được để trống");
        }
        try {
            JsonNode root = objectMapper.readTree(answerData);
            // Other question types keep their existing JSON format.
            if (questionType != Question.QuestionType.MCQ) {
                return answerData.trim();
            }
            if (root == null || !root.isObject() || !root.path("options").isObject()) {
                throw new IllegalArgumentException("Đáp án MCQ phải có đủ bốn lựa chọn A–D");
            }
            ObjectNode options = (ObjectNode) root.get("options");
            boolean normalized = false;
            for (String key : List.of("A", "B", "C", "D")) {
                JsonNode option = options.get(key);
                if (option == null || !option.isTextual()) {
                    throw new IllegalArgumentException("Đáp án " + key + " phải là văn bản và không được để trống");
                }
                String value = option.textValue();
                validateText(value, "Đáp án " + key);
                String trimmed = value.trim();
                normalized |= !value.equals(trimmed);
                options.put(key, trimmed);
            }
            JsonNode correctAnswer = root.get("correctAnswer");
            if (correctAnswer == null || !correctAnswer.isTextual()
                    || !List.of("A", "B", "C", "D").contains(correctAnswer.textValue())) {
                throw new IllegalArgumentException("Vui lòng chọn đáp án đúng A, B, C hoặc D");
            }
            return normalized ? objectMapper.writeValueAsString(root) : answerData.trim();
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Answer data must be valid JSON", exception);
        }
    }

    private QuestionGrammarResponse toResponse(Question question) {
        return new QuestionGrammarResponse(
                question.getId(), question.getSkill(), question.getQuestionType(),
                question.getLessonId(), question.getGrammarId(), question.getContent(), question.getMediaUrl(),
                question.getExplanation(), question.getAnswerData(), question.getDifficulty(),
                question.getIsExerciseQuestion(), question.getDisplayOrder(), question.getStatus(),
                question.getCreatedBy(), question.getUpdatedBy(), question.getCreatedAt(),
                question.getUpdatedAt());
    }
    private List<QuestionRow> readAndValidateExcel(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalidExcel(0, "File", "Vui lòng chọn file Excel có dữ liệu.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File Excel không được vượt quá 5 MB.");
        }
        if (file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw invalidExcel(0, "File", "Vui lòng chọn file Excel .xlsx.");
        }
        // Only parse OOXML workbooks. Renaming an arbitrary file to .xlsx is insufficient.
        try (var input = file.getInputStream(); var workbook = new XSSFWorkbook(input)) {
            if (workbook.getNumberOfSheets() == 0) {
                throw invalidExcel(0, "File", "File không có sheet câu hỏi.");
            }
            var sheet = workbook.getSheetAt(0);
            var formatter = new DataFormatter(Locale.ROOT);
            var errors = new ArrayList<RowError>();
            var header = sheet.getRow(1);
            for (int column = 0; column < COLUMNS.size(); column++) {
                String value = readExcelText(header, column, 2, formatter, errors);
                if (!HEADERS.get(column).contains(normalizeExcelValue(value))) {
                    errors.add(new RowError(2, COLUMNS.get(column), "Tiêu đề cột không đúng mẫu."));
                }
            }
            if (header != null) {
                for (int c = COLUMNS.size(); c < header.getLastCellNum(); c++) {
                    if (!formatter.formatCellValue(header.getCell(c)).isBlank()) {
                        errors.add(new RowError(2, "Cấu trúc", "Mẫu chỉ gồm 9 cột từ STT đến Độ khó."));
                        break;
                    }
                }
            }
            if (!errors.isEmpty()) throw new GrammarQuestionImportException(errors);
            if (sheet.getLastRowNum() >= MAX_SHEET_ROWS) {
                throw invalidExcel(0, "File", "Sheet vượt quá 10.000 dòng, vui lòng dùng mẫu gọn hơn.");
            }

            var questions = new ArrayList<QuestionRow>();
            int questionCount = 0;
            for (int r = 2; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                // A pre-filled STT alone is not a question. Formulas and errors count as data.
                boolean hasData = false;
                for (int c = 1; c < row.getLastCellNum(); c++) {
                    Cell cell = row.getCell(c);
                    if (cell != null && (cell.getCellType() == CellType.FORMULA
                            || cell.getCellType() == CellType.ERROR || !formatter.formatCellValue(cell).isBlank())) {
                        hasData = true;
                        break;
                    }
                }
                if (!hasData) continue;
                if (++questionCount > MAX_QUESTIONS) {
                    errors.add(new RowError(r + 1, "File", "Mỗi file chỉ được nhập tối đa 500 câu hỏi."));
                    break;
                }
                int before = errors.size();
                String[] values = new String[9];
                for (int c = 0; c < 9; c++) values[c] = readExcelText(row, c, r + 1, formatter, errors);
                for (int c = 9; c < row.getLastCellNum(); c++) {
                    if (!formatter.formatCellValue(row.getCell(c)).isBlank()) {
                        errors.add(new RowError(r + 1, "Cấu trúc", "Có dữ liệu ngoài 9 cột của mẫu."));
                        break;
                    }
                }
                for (int c : new int[]{1, 2, 3, 4, 5, 7}) {
                    if (values[c].isBlank()) errors.add(new RowError(r + 1, COLUMNS.get(c), "Không được để trống."));
                    else if (values[c].length() > 100) errors.add(new RowError(r + 1, COLUMNS.get(c), "Không được vượt quá 100 ký tự."));
                }
                String correct = values[6].toUpperCase(Locale.ROOT);
                if (!List.of("A", "B", "C", "D").contains(correct)) {
                    errors.add(new RowError(r + 1, COLUMNS.get(6), "Chỉ chấp nhận một đáp án A, B, C hoặc D."));
                }
                Question.Difficulty difficulty = switch (normalizeExcelValue(values[8])) {
                    case "de", "easy" -> Question.Difficulty.EASY;
                    case "trung binh", "medium" -> Question.Difficulty.MEDIUM;
                    case "kho", "hard" -> Question.Difficulty.HARD;
                    default -> null;
                };
                if (difficulty == null) errors.add(new RowError(r + 1, COLUMNS.get(8), "Chọn Dễ, Trung bình, Khó hoặc EASY, MEDIUM, HARD."));
                if (errors.size() == before) {
                    questions.add(new QuestionRow(r + 1, values[1],
                            Map.of("A", values[2], "B", values[3], "C", values[4], "D", values[5]),
                            correct, values[7], difficulty));
                }
            }
            if (questionCount == 0) errors.add(new RowError(0, "File", "File không có câu hỏi nào để nhập."));
            if (!errors.isEmpty()) throw new GrammarQuestionImportException(errors);
            return List.copyOf(questions);
        } catch (GrammarQuestionImportException | ResponseStatusException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw invalidExcel(0, "File", "Không đọc được file .xlsx. File có thể bị hỏng, được bảo vệ hoặc không đúng định dạng.");
        }
    }

    private String readExcelText(Row row, int column, int excelRow, DataFormatter formatter, List<RowError> errors) {
        Cell cell = row == null ? null : row.getCell(column);
        if (cell == null) return "";
        if (cell.getCellType() == CellType.FORMULA || cell.getCellType() == CellType.ERROR) {
            errors.add(new RowError(excelRow, COLUMNS.get(column), "Chỉ nhập giá trị trực tiếp, không dùng công thức hoặc ô lỗi."));
            return "";
        }
        return formatter.formatCellValue(cell).trim();
    }

    private String normalizeExcelValue(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'D').replace('\u00a0', ' ')
                .trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private GrammarQuestionImportException invalidExcel(int row, String column, String message) {
        return new GrammarQuestionImportException(List.of(new RowError(row, column, message)));
    }
}
