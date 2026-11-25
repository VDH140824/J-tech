package com.jtech.dto.request;

import com.jtech.entity.Question;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;


public record QuestionBankRequest(
        @NotNull(message = "Vui lòng chọn kỹ năng.") Question.Skill skill,
        @NotNull(message = "Vui lòng chọn dạng câu hỏi.") Question.QuestionType questionType,
        Long lessonId,
        Long grammarId,
        @NotBlank(message = "Nội dung câu hỏi không được để trống.")
        @Size(max = 2000, message = "Nội dung câu hỏi tối đa 2000 ký tự.") String content,
        @Size(max = 2000, message = "Giải thích tối đa 2000 ký tự.") String explanation,
        @NotNull(message = "Vui lòng chọn độ khó.") Question.Difficulty difficulty,
        Boolean isExerciseQuestion,
        List<String> options,
        String correctAnswer,
        Map<String, String> matches) {
}
