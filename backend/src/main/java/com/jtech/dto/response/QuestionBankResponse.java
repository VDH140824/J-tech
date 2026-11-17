package com.jtech.dto.response;

import com.jtech.entity.Question;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** UC-39 Manage Question Bank: dữ liệu trả về cho màn Ngân hàng câu hỏi. */
public final class QuestionBankResponse {

    private QuestionBankResponse() {
    }

    /** Một dòng trong danh sách câu hỏi. */
    public record Summary(
            Long id,
            Question.Skill skill,
            Question.QuestionType questionType,
            Question.Difficulty difficulty,
            Question.QuestionStatus status,
            String content,
            boolean exerciseQuestion,
            Long courseId,
            String courseName,
            Long chapterId,
            Integer chapterNo,
            String chapterTitle,
            Long lessonId,
            String lessonTitle,
            /** Tên điểm ngữ pháp mà câu hỏi gắn vào (kỹ năng Ngữ pháp). */
            String targetName,
            LocalDateTime updatedAt) {
    }

    /** Chi tiết câu hỏi (A2) kèm cờ BR-29 / BR-13 để màn hình khóa sửa đáp án hoặc đề nghị lưu trữ. */
    public record Detail(
            Summary summary,
            Long grammarId,
            String explanation,
            List<String> options,
            String correctAnswer,
            Map<String, String> matches,
            /** BR-29: đã có học viên làm câu này → không được đổi đáp án. */
            boolean attempted,
            /** BR-13: true = xóa vĩnh viễn được; false = chỉ lưu trữ. */
            boolean canDelete,
            /** Lý do phải lưu trữ thay vì xóa (null nếu canDelete). */
            String retentionReason,
            /** Các đề kiểm tra đang chứa câu hỏi (test_question). */
            List<TestItem> tests) {
    }

    public record Page(List<Summary> content, long totalElements, int totalPages, int page, int size) {
    }

    /** Dữ liệu cho bộ lọc và chọn nơi gắn câu hỏi. */
    public record Targets(
            List<CourseItem> courses,
            List<ChapterItem> chapters,
            List<LessonItem> lessons,
            List<GrammarItem> grammars,
            /** Đề kiểm tra cho bộ lọc "Bài test" */
            List<TestOption> tests) {
    }

    public record CourseItem(Long id, String name) {
    }

    public record ChapterItem(Long id, Long courseId, Integer chapterNo, String title) {
    }

    public record LessonItem(Long id, Long chapterId, String skillType, Integer lessonNo, String title) {
    }

    public record GrammarItem(Long id, Long lessonId, String structureName) {
    }

    /** Đề kiểm tra cho bộ lọc: chapterId của mini test lấy theo bài học. */
    public record TestOption(Long id, String testType, String skill, String title, Long chapterId, Long lessonId) {
    }

    /**
     * Đề kiểm tra (bảng test): MINI_TEST của bài học hoặc CHAPTER_TEST của chương.
     * locked = đề đã có lượt làm → không thêm / bỏ câu hỏi được.
     */
    public record TestItem(Long id, String testType, String skill, String title, String status, boolean locked) {
    }

    /** archived = true khi BR-13 buộc giữ lại câu hỏi (chuyển ARCHIVED); reason = lý do giữ lại. */
    public record DeleteResult(Long id, boolean archived, String reason) {
    }
}
