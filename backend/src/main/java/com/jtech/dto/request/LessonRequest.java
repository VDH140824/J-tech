package com.jtech.dto.request;

import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LessonRequest(
    Lesson.SkillType skillType,

    @NotNull(message = "Số bài học là bắt buộc")
    Integer lessonNo,

    @NotBlank(message = "Tiêu đề bài học không được để trống")
    @Size(max = 200, message = "Tiêu đề không quá 200 ký tự")
    String title,

    String description,
    String documents,
    Integer displayOrder,
    Course.Status status
) {}
