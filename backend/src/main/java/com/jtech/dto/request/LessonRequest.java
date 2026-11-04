package com.jtech.dto.request;

import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record LessonRequest(
    Lesson.SkillType skillType,

    @NotNull(message = "Số bài học là bắt buộc")
    @Min(value = 1, message = "Số bài học phải lớn hơn 0")
    Integer lessonNo,

    @NotBlank(message = "Tiêu đề bài học không được để trống")
    @Size(max = 100, message = "Tiêu đề không quá 100 ký tự")
    String title,

    @NotBlank(message = "Mô tả là bắt buộc")
    @Size(max = 100, message = "Mô tả không quá 100 ký tự")
    String description,
    String documents,
    @NotNull(message = "Thứ tự hiển thị là bắt buộc")
    @Min(value = 1, message = "Thứ tự hiển thị phải lớn hơn 0")
    Integer displayOrder,
    Course.Status status
) {
    public LessonRequest {
        title = normalize(title);
        description = normalize(description);
        documents = normalize(documents);
    }

    private static String normalize(String value) {
        // Match JavaScript trim(), including non-breaking spaces and BOM.
        return value == null ? null : value.replaceAll(
                "^[\\s\\p{Zs}\\u2028\\u2029\\uFEFF]+|[\\s\\p{Zs}\\u2028\\u2029\\uFEFF]+$", "");
    }
}
