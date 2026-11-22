package com.jtech.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Quản lý bài kiểm tra (Moderator): dữ liệu trả về màn hình. */
public final class TestManagementResponse {

    private TestManagementResponse() {
    }

    /** Một dòng trong danh sách đề. skill = ALL với test chương tổng hợp. */
    public record Summary(
            Long id,
            String testType,
            String skill,
            String status,
            String title,
            Long courseId,
            String courseName,
            Long chapterId,
            Integer chapterNo,
            String chapterTitle,
            Long lessonId,
            String lessonTitle,
            int questionCount,
            int durationMinutes,
            BigDecimal passingScore,
            long attemptCount,
            LocalDateTime updatedAt) {
    }

    /** Chi tiết đề: locked = đã có lượt làm (BR-T6). */
    public record Detail(
            Summary summary,
            String description,
            List<QuestionItem> questions,
            boolean locked) {
    }

    /**
     * Câu hỏi ngân hàng (trong đề hoặc để chọn). answerData giữ nguyên JSON để màn hình xem trước đáp án.
     * exerciseQuestion = câu luyện tập (không được chọn vào đề, BR-T1).
     */
    public record QuestionItem(
            Long id,
            String skill,
            String questionType,
            String difficulty,
            String status,
            boolean exerciseQuestion,
            String content,
            String answerData,
            Long lessonId,
            String lessonTitle,
            String lessonStatus,
            Long chapterId) {
    }

    public record Page(List<Summary> content, long totalElements, int totalPages, int page, int size) {
    }

    /** archived = true khi đề đã có lượt làm nên chuyển Lưu trữ thay vì xóa (BR-T7). */
    public record DeleteResult(Long id, boolean archived, String reason) {
    }
}
