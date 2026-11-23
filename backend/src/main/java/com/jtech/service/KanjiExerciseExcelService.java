package com.jtech.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.KanjiExerciseRequest;
import com.jtech.dto.response.KanjiExerciseResponse;
import com.jtech.entity.Question;
import java.io.ByteArrayOutputStream;
import java.security.Principal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class KanjiExerciseExcelService {
    static final List<String> HEADERS = List.of("STT", "Nội dung câu hỏi", "A", "B", "C", "D",
        "Đáp án đúng", "Giải thích", "Độ khó", "Loại câu hỏi", "Thứ tự hiển thị", "E", "F", "Cặp nối (JSON)");
    private final KanjiChapterService chapters;
    private final KanjiExerciseService exercises;
    private final ObjectMapper mapper;

    public record RowError(int row, String column, String message) {}
    public record ImportResult(int importedCount) {}
    public static class InvalidExcel extends RuntimeException {
        public final List<RowError> errors;
        InvalidExcel(List<RowError> errors) { super("File Excel chưa hợp lệ. Chưa lưu câu hỏi nào."); this.errors = List.copyOf(errors); }
    }
    private InvalidExcel invalid(String message) { return new InvalidExcel(List.of(new RowError(0, "File", message))); }

    List<KanjiExerciseRequest> parse(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 5L * 1024 * 1024
            || file.getOriginalFilename() == null || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"))
            throw invalid("Chọn file .xlsx có dữ liệu, tối đa 5 MB.");
        try (var input = file.getInputStream(); var book = new XSSFWorkbook(input)) {
            if (book.getNumberOfSheets() == 0) throw invalid("Không có sheet dữ liệu.");
            var sheet = book.getSheetAt(0);
            if (sheet.getLastRowNum() >= 10000) throw invalid("File vượt quá 10.000 dòng.");
            var formatter = new DataFormatter(Locale.ROOT);
            var header = sheet.getRow(1);
            for (int c = 0; c < HEADERS.size(); c++) {
                if (header == null || !HEADERS.get(c).equals(formatter.formatCellValue(header.getCell(c)).trim()))
                    throw invalid("Giữ nguyên tiêu đề dòng 2 của mẫu Kanji.");
            }
            var errors = new ArrayList<RowError>();
            var result = new ArrayList<KanjiExerciseRequest>();
            int count = 0;
            for (int r = 2; r <= sheet.getLastRowNum(); r++) {
                var row = sheet.getRow(r);
                if (row == null) continue;
                String[] values = new String[HEADERS.size()];
                Arrays.fill(values, "");
                boolean nonempty = false;
                for (int c = 0; c < row.getLastCellNum(); c++) {
                    var cell = row.getCell(c);
                    String value = formatter.formatCellValue(cell).trim();
                    if (!value.isEmpty()) nonempty = true;
                    if (cell != null && (cell.getCellType() == CellType.FORMULA || cell.getCellType() == CellType.ERROR))
                        errors.add(new RowError(r + 1, c < HEADERS.size() ? HEADERS.get(c) : "Cấu trúc", "Không dùng công thức hoặc ô lỗi."));
                    if (c < values.length) values[c] = value;
                    else if (!value.isEmpty()) errors.add(new RowError(r + 1, "Cấu trúc", "Có dữ liệu ngoài các cột mẫu."));
                }
                if (!nonempty) continue;
                if (++count > 500) { errors.add(new RowError(r + 1, "File", "Tối đa 500 câu hỏi/file.")); break; }
                try {
                    var type = values[9].isBlank() ? Question.QuestionType.MCQ : Question.QuestionType.valueOf(values[9]);
                    String difficulty = switch (values[8].toLowerCase(Locale.ROOT)) {
                        case "dễ", "easy" -> "EASY";
                        case "trung bình", "medium" -> "MEDIUM";
                        case "khó", "hard" -> "HARD";
                        default -> values[8];
                    };
                    var options = new ArrayList<String>();
                    if (type == Question.QuestionType.MCQ) {
                        // Empty middle choices are invalid: do not silently shift answer letters.
                        String[] choices = {values[2], values[3], values[4], values[5], values[11], values[12]};
                        int last = choices.length - 1;
                        while (last >= 0 && choices[last].isEmpty()) last--;
                        for (int c = 0; c <= last; c++) options.add(choices[c]);
                    }
                    String answer = values[6];
                    if (type == Question.QuestionType.MCQ) {
                        int index = "ABCDEF".indexOf(answer.toUpperCase(Locale.ROOT));
                        if (answer.length() != 1 || index < 0 || index >= options.size())
                            throw new IllegalArgumentException("Đáp án đúng phải là chữ A–F ứng với lựa chọn.");
                        answer = options.get(index);
                    }
                    Map<String, String> matches = type == Question.QuestionType.MATCHING
                        ? mapper.readValue(values[13], new TypeReference<LinkedHashMap<String, String>>() {}) : Map.of();
                    var request = new KanjiExerciseRequest(type, values[1], values[7], Question.Difficulty.valueOf(difficulty),
                        Integer.valueOf(values[10]), options, type == Question.QuestionType.MATCHING ? "" : answer, matches);
                    exercises.validateAnswer(request);
                    result.add(request);
                } catch (Exception e) {
                    errors.add(new RowError(r + 1, "Câu hỏi", e instanceof IllegalArgumentException ? e.getMessage()
                        : "Cặp nối phải là JSON gồm các cặp chuỗi, ví dụ {\"日\":\"nhật\",\"月\":\"nguyệt\"}."));
                }
            }
            if (count == 0) errors.add(new RowError(0, "File", "File không có câu hỏi."));
            if (!errors.isEmpty()) throw new InvalidExcel(errors);
            return result;
        } catch (InvalidExcel e) { throw e; }
        catch (Exception e) { throw invalid("Không đọc được file Excel .xlsx. Hãy tải lại mẫu Kanji."); }
    }

    @Transactional
    public ImportResult importFile(Principal p, long chapterId, long documentLessonId, MultipartFile file) {
        chapters.exercises(p, chapterId, null, 0, 1, documentLessonId, false);
        var requests = parse(file);
        for (var request : requests) chapters.saveExercise(p, chapterId, null, request, documentLessonId);
        return new ImportResult(requests.size());
    }

    @Transactional(readOnly = true)
    public byte[] exportFile(Principal p, long chapterId, long documentLessonId, Question.QuestionStatus status) {
        var rows = new ArrayList<KanjiExerciseResponse>();
        int page = 0;
        while (true) {
            var batch = chapters.exercises(p, chapterId, status, page++, 100, documentLessonId, false);
            rows.addAll(batch.getContent());
            if (!batch.hasNext()) break;
        }
        return workbook(rows);
    }

    public byte[] template(Principal p, long chapterId) {
        chapters.content(p, chapterId);
        return workbook(List.of());
    }

    byte[] workbook(List<KanjiExerciseResponse> rows) {
        try (var book = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var sheet = book.createSheet("Kanji");
            sheet.createRow(0).createCell(0).setCellValue("Nhập từ dòng 3. MCQ: đáp án A–F; FILL_IN: đáp án chữ; MATCHING: cặp nối JSON. Thứ tự: 0–65535. Nhập lại sẽ thêm câu mới.");
            var header = sheet.createRow(1);
            var style = book.createCellStyle();
            var font = book.createFont(); font.setBold(true); style.setFont(font);
            for (int c = 0; c < HEADERS.size(); c++) {
                header.createCell(c).setCellValue(HEADERS.get(c)); header.getCell(c).setCellStyle(style);
                sheet.setColumnWidth(c, (c == 1 || c == 7 || c == 13 ? 45 : 20) * 256);
            }
            int index = 2;
            for (var q : rows) {
                var row = sheet.createRow(index++);
                var options = q.options() == null ? List.<String>of() : q.options();
                String answer = q.correctAnswer();
                if (q.questionType() == Question.QuestionType.MCQ) {
                    int correct = options.indexOf(answer);
                    answer = correct >= 0 ? String.valueOf((char) ('A' + correct)) : "";
                }
                String[] values = {String.valueOf(index - 2), q.content(), "", "", "", "", answer,
                    q.explanation(), q.difficulty().name(), q.questionType().name(), String.valueOf(q.displayOrder()), "", "",
                    q.questionType() == Question.QuestionType.MATCHING ? mapper.writeValueAsString(q.matches()) : ""};
                int[] columns = {2, 3, 4, 5, 11, 12};
                for (int c = 0; c < options.size(); c++) values[columns[c]] = options.get(c);
                for (int c = 0; c < values.length; c++) row.createCell(c, CellType.STRING).setCellValue(Objects.toString(values[c], ""));
            }
            sheet.createFreezePane(2, 2);
            book.write(output);
            return output.toByteArray();
        } catch (Exception e) { throw new IllegalStateException("Không tạo được file Excel Kanji.", e); }
    }
}
