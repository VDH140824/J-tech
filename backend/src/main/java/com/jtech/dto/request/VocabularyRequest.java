package com.jtech.dto.request;

import com.jtech.entity.Course;
import jakarta.validation.constraints.*;

public record VocabularyRequest(
    @NotBlank(message = "Vui lòng nhập đầy đủ thông tin bắt buộc") @Size(max = 100) String word,
    @NotBlank(message = "Vui lòng nhập đầy đủ thông tin bắt buộc") @Size(max = 100) String reading,
    @NotBlank(message = "Vui lòng nhập đầy đủ thông tin bắt buộc")
    @Size(max = 255)
    String meaningVi,
    @Size(max = 50) String wordType,
    @Size(max = 500) String exampleJp,
    @Size(max = 500) String exampleVi,
    @NotNull @Min(0) Integer displayOrder,
    @NotNull Course.Status status
) {}
