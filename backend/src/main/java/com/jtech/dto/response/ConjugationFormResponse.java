package com.jtech.dto.response;

import com.jtech.entity.Course;

import java.time.LocalDateTime;

public record ConjugationFormResponse(
        Long id,
        String code,
        String nameVi,
        String nameJp,
        String description,
        String materialContent,
        Integer questionsPerPractice,
        Integer displayOrder,
        Course.Status status,
        long linkedQuestionCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
