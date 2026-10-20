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
    @Size(max = 200, message = "Tiêu đề không quá 200 ký tự")
    String title,

    String description,
    String documents,
    @NotNull(message = "Thứ tự hiển thị là bắt buộc")
    @Min(value = 1, message = "Thứ tự hiển thị phải lớn hơn 0")
    Integer displayOrder,
    Course.Status status
) {}
