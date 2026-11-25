package com.jtech.dto.request;

import com.jtech.entity.Question;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;


public record ConjugationQuestionRequest(
        @NotBlank(message = "Vui lòng nhập động từ.")
        @Size(max = 50, message = "Động từ tối đa 50 ký tự.") String verb,
        @Size(max = 50, message = "Cách đọc tối đa 50 ký tự.") String reading,
        @Size(max = 100, message = "Nghĩa tiếng Việt tối đa 100 ký tự.") String meaningVi,
        @NotNull(message = "Vui lòng chọn nhóm động từ.")
        @Min(value = 1, message = "Nhóm động từ phải là 1, 2 hoặc 3.")
        @Max(value = 3, message = "Nhóm động từ phải là 1, 2 hoặc 3.") Integer verbGroup,
        @NotNull(message = "Vui lòng chọn độ khó.") Question.Difficulty difficulty,
        @NotBlank(message = "Vui lòng nhập đáp án đúng.")
        @Size(max = 50, message = "Đáp án tối đa 50 ký tự.") String correctAnswer,
        @Size(max = 5, message = "Tối đa 5 cách viết khác.") List<String> acceptedAnswers,
        @Size(max = 3, message = "Tối đa 3 phương án nhiễu.") List<String> options,
        @Size(max = 500, message = "Giải thích tối đa 500 ký tự.") String explanation,
        Boolean isExerciseQuestion
) {}
