package com.jtech.dto.request;

import com.jtech.entity.Question;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

public record QuestionGrammarUpdateRequest(
        @NotNull Question.QuestionType questionType,
        @NotBlank(message = "Nội dung câu hỏi không được để trống") @Size(max = 100, message = "Nội dung câu hỏi không được vượt quá 100 ký tự") String content,
        @NotBlank(message = "Giải thích không được để trống") @Size(max = 100, message = "Giải thích không được vượt quá 100 ký tự") String explanation,
        @NotBlank String answerData,
        @NotNull Question.Difficulty difficulty,
        @NotNull @Min(value = 1, message = "Thứ tự hiển thị phải từ 1 trở lên") @Max(value = 65535, message = "Thứ tự hiển thị không được vượt quá 65535") Integer displayOrder
) {
    public QuestionGrammarUpdateRequest {
        content = content == null ? null : content.trim();
        explanation = explanation == null ? null : explanation.trim();
    }
}
