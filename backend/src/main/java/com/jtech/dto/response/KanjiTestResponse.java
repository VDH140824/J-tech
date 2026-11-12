package com.jtech.dto.response;

import com.jtech.dto.request.KanjiTestRequest;
import java.util.List;
import java.util.Map;

public record KanjiTestResponse(
  Long id,
  KanjiTestRequest test,
  List<BankQuestion> bank
) {
  public record BankQuestion(
    long id,
    long lessonId,
    int lessonNo,
    String lessonTitle,
    boolean published,
    com.jtech.dto.request.KanjiExerciseRequest question
  ) {}

  public record QuestionView(
    String id,
    String type,
    String content,
    List<String> options,
    List<String> left,
    List<String> right,
    String answer,
    String explanation,
    Boolean correct
  ) {}

  public record Attempt(
    long id,
    long chapterId,
    String title,
    String status,
    String deadlineAt,
    String submittedAt,
    String serverTime,
    Double score,
    boolean passed,
    int passingScore,
    int correctCount,
    List<QuestionView> questions,
    Map<String, String> answers
  ) {}
}
