package com.jtech.dto.response;

import com.jtech.entity.Course;

public record ChapterDetailResponse(
        Long id,
        Integer chapterNo,
        String title,
        String description,
        Integer displayOrder,
        Course.Status status,
        Long courseId,
        String courseName,
        String courseCode
) {}
