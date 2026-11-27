package com.jtech.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;

public record KanjiTestRequest(
  @NotBlank @Size(max = 200) String title,
  @Size(max = 10000) String description,
  @Min(1) @Max(180) int durationMinutes,
  @Min(0) @Max(100) int passingScore,
  @NotNull Status status,
  @NotEmpty
  @Size(max = 100)
  List<@NotNull @Valid KanjiExerciseRequest> questions
) {
  public enum Status {
    DRAFT,
    PUBLISHED,
    ARCHIVED,
  }

  public record Answers(
    @NotNull
    @Size(max = 1100)
    Map<
      @NotBlank @Size(max = 30) String,
      @NotNull @Size(max = 1000) String
    > answers
  ) {}
}
