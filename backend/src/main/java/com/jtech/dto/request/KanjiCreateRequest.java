package com.jtech.dto.request;

import com.jtech.entity.Kanji;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record KanjiCreateRequest(
        @NotBlank @Size(max = 10) String characterText,
        @Size(max = 50) String sinoVietnamese,
        @Size(max = 100) String onyomi,
        @Size(max = 100) String kunyomi,
        @NotBlank @Size(max = 255) String meaningVi,
        @Size(max = 16000) String examples,
        @Size(max = 16000) String mnemonicStory,
        @Min(0) Integer displayOrder,
        Kanji.Status status
) {}
