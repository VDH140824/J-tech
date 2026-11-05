package com.jtech.dto.request;

import com.jtech.entity.Course;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu tạo / sửa thể chia. Độ dài tối đa khớp kích thước cột trong jtech.sql.
 *
 * questionsPerPractice chỉ yêu cầu >= 1. BR-104 (từ 5 trở lên, không vượt số câu hỏi hiện có)
 * kiểm tra khi publish, không kiểm tra lúc tạo mới (UC-47).
 */
public record ConjugationFormRequest(
        @NotBlank(message = "Nội dung * là bắt buộc, không được để trống.")
        @Size(max = 30, message = "Quá số kí tự quy định, vui lòng nhập lại.")
        String code,

        @NotBlank(message = "Nội dung * là bắt buộc, không được để trống.")
        @Size(max = 100, message = "Quá số kí tự quy định, vui lòng nhập lại.")
        String nameVi,

        @NotBlank(message = "Nội dung * là bắt buộc, không được để trống.")
        @Size(max = 100, message = "Quá số kí tự quy định, vui lòng nhập lại.")
        String nameJp,

        @Size(max = 5000, message = "Quá số kí tự quy định, vui lòng nhập lại.")
        String description,

        /* Quy tắc chia Nhóm I, II, III gộp thành một văn bản có đánh dấu từng nhóm. */
        @NotBlank(message = "Nội dung * là bắt buộc, không được để trống.")
        String materialContent,

        @NotNull(message = "Nội dung * là bắt buộc, không được để trống.")
        @Min(value = 1, message = "Số câu hỏi mỗi lượt phải lớn hơn 0.")
        Integer questionsPerPractice,

        @Min(value = 0, message = "Thứ tự hiển thị phải từ 0 trở lên.")
        Integer displayOrder,

        /* Chỉ dùng cho luồng Update; Create bỏ qua và luôn tạo ở DRAFT. Update mà null thì giữ trạng thái cũ. */
        Course.Status status
) {}
