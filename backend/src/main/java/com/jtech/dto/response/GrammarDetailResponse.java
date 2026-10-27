package com.jtech.dto.response;

import com.jtech.entity.Grammar;
import java.time.LocalDateTime;

public record GrammarDetailResponse(
        Long id,
        Long lessonId,
        String structureName,
        String meaningVi,
        String usageExplanation,
        String exampleJp,
        String exampleVi,
        String videoUrl,
        String videoPublicId,
        Integer videoDurationSec,
        Integer displayOrder,
        Grammar.Status status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
