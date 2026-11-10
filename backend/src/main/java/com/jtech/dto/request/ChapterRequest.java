package com.jtech.dto.request;

import com.jtech.entity.Course;
import jakarta.validation.constraints.*;

public record ChapterRequest(
        @NotNull @Min(1) @Max(65535) Integer chapterNo,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10000) String description,
        @NotNull @Min(0) Integer displayOrder,
        @NotNull Course.Status status) {}
