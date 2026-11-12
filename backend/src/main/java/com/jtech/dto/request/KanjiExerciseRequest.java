package com.jtech.dto.request;

import com.jtech.entity.Question;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;

public record KanjiExerciseRequest(
  @NotNull Question.QuestionType questionType,
  @NotBlank @Size(max = 10000) String content,
  @Size(max = 10000) String explanation,
  @NotNull Question.Difficulty difficulty,
  @NotNull @Min(0) @Max(65535) Integer displayOrder,
  @Size(max = 6) List<@NotBlank @Size(max = 1000) String> options,
  @Size(max = 1000) String correctAnswer,
  @Size(max = 10)
  Map<
    @NotBlank @Size(max = 1000) String,
    @NotBlank @Size(max = 1000) String
  > matches
) {}
