package com.jtech.dto.response;

import com.jtech.entity.Course;

public record ModeratorCourseSummary(Long id, String code, String name, String description,
        String thumbnailUrl, Course.Status status, Long chapterCount, Long lessonCount) {}
