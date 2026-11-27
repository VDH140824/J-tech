package com.jtech.dto.request;
import com.jtech.entity.Course;
import jakarta.validation.constraints.*;
public record CourseRequest(
        @NotBlank @Size(max = 20) String code,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 10000) String description,
        @Size(max = 500) String thumbnailUrl,
        @NotNull @Min(0) Integer displayOrder,
        @NotNull Course.Status status) {}
