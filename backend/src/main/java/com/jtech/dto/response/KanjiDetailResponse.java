package com.jtech.dto.response;

import com.jtech.entity.Kanji;
import java.time.LocalDateTime;

public record KanjiDetailResponse(
        Long id,
        Long lessonId,
        String characterText,
        String sinoVietnamese,
        String onyomi,
        String kunyomi,
        String meaningVi,
        String examples,
        String imageUrl,
        String imagePublicId,
        String mnemonicStory,
        Integer displayOrder,
        Kanji.Status status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
