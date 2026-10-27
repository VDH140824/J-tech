package com.jtech.dto.response;

import com.jtech.entity.Question;
import java.time.LocalDateTime;

public record QuestionGrammarResponse(
        Long id,
        Question.Skill skill,
        Question.QuestionType questionType,
        Long lessonId,
        String content,
        String mediaUrl,
        String explanation,
        String answerData,
        Question.Difficulty difficulty,
        Boolean isExerciseQuestion,
        Integer displayOrder,
        Question.QuestionStatus status,
        Long createdBy,
        Long updatedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
