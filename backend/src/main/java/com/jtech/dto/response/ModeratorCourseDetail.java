package com.jtech.dto.response;
import com.jtech.entity.Course;
public record ModeratorCourseDetail(Long id, String code, String name, String description,
        String thumbnailUrl, Integer displayOrder, Course.Status status) {}
