package com.jtech.dto.response;

import com.jtech.entity.Question;

import java.util.List;

/**
 * SD-29.5: một câu hỏi trong danh sách câu hỏi luyện tập của thể chia.
 * Kèm dữ liệu đọc từ answer_data để Moderator lọc theo nhóm động từ và mở form sửa.
 */
public record PracticeQuestionResponse(
        Long id,
        String content,
        Question.Difficulty difficulty,
        boolean selected,
        String verb,
        String reading,
        String meaningVi,
        int verbGroup,
        String correctAnswer,
        List<String> acceptedAnswers,
        List<String> options,
        String explanation
) {}
