package com.jtech.dto.response;

import com.jtech.entity.Course;

import java.time.LocalDateTime;
import java.util.List;

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
        long practiceQuestionCount,
        List<String> missingTheoryGroups,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
