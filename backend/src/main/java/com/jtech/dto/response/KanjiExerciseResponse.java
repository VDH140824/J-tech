package com.jtech.dto.response;

import com.jtech.entity.Question;
import java.util.List;
import java.util.Map;

public record KanjiExerciseResponse(
  Long id,
  Long lessonId,
  Question.QuestionType questionType,
  String content,
  String explanation,
  Question.Difficulty difficulty,
  Integer displayOrder,
  Question.QuestionStatus status,
  List<String> options,
  String correctAnswer,
  Map<String, String> matches
) {}
