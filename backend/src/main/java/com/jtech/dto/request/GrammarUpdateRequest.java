package com.jtech.dto.request;

import com.jtech.entity.Grammar;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record GrammarUpdateRequest(
        @NotBlank @Size(max = 150) String structureName,
        @NotBlank @Size(max = 255) String meaningVi,
        @NotBlank String usageExplanation,
        @NotBlank String exampleJp,
        @NotBlank String exampleVi,
        @Size(max = 500) String videoUrl,
        @Size(max = 255) String videoPublicId,
        @Min(0) Integer videoDurationSec,
        @NotNull @Min(0) Integer displayOrder,
        @NotNull Grammar.Status status
) {}
