package com.jtech.dto.response;

import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import java.time.LocalDateTime;

public record LessonResponse(
    Long id,
    Long chapterId,
    Lesson.SkillType skillType,
    Integer lessonNo,
    String title,
    String description,
    String documents,
    Integer displayOrder,
    Course.Status status,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {}
