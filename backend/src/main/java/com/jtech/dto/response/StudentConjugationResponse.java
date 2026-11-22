package com.jtech.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Conjugation List (3.6.25) và Conjugation Practice (3.6.26) phía học viên. */
public final class StudentConjugationResponse {
    private StudentConjugationResponse() {}

    /** Thẻ thể chia trên Conjugation List. questionCount tính theo bộ lọc nhóm động từ. */
    public record FormCard(
        Long id,
        String code,
        String nameVi,
        String nameJp,
        String description,
        int questionsPerPractice,
        int questionCount,
        int attemptCount,
        BigDecimal bestScore,
        boolean passed
    ) {}

    /** “Xem cách chia”: tài liệu + số câu theo nhóm + tiến độ luyện tập của học viên. */
    public record FormDetail(
        Long id,
        String code,
        String nameVi,
        String nameJp,
        String description,
        String materialContent,
        int verbGroup,
        String difficulty,
        int questionsPerPractice,
        Map<Integer, Integer> questionCountByGroup,
        Map<String, Integer> questionCountByDifficulty,
        int attemptCount,
        BigDecimal bestScore,
        boolean passed
    ) {}

    /** Câu hỏi không kèm đáp án. options chỉ có khi mode = choice và đủ phương án. */
    public record Question(
        Long id,
        String instruction,
        String verb,
        String reading,
        String meaningVi,
        Integer verbGroup,
        List<String> options
    ) {}

    /** Một lượt luyện tập: N câu ngẫu nhiên (N = questions_per_practice, hoặc ít hơn nếu không đủ câu). */
    public record PracticeSession(
        Long formId,
        String nameVi,
        String nameJp,
        int verbGroup,
        String difficulty,
        String mode,
        int questionsPerPractice,
        List<Question> questions
    ) {}

    public record CheckRequest(Long questionId, String answer) {}

    public record CheckResult(
        Long questionId,
        boolean correct,
        String correctAnswer,
        List<String> acceptedAnswers,
        String explanation
    ) {}

    public record SubmitRequest(Integer verbGroup, String difficulty, String mode, Map<String, String> answers) {}

    public record Result(
        Long formId,
        int verbGroup,
        int totalQuestions,
        int correctCount,
        BigDecimal score,
        BigDecimal passingScore,
        boolean passed,
        long coinsAwarded,
        List<CheckResult> details
    ) {}
}
