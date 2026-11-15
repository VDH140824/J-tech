package com.jtech.repository;

import com.jtech.entity.Question;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface QuestionConjugationRepository extends JpaRepository<Question, Long> {

    /** Số câu hỏi đã gắn với thể chia. Flush mode COMMIT để không auto-flush form đang sửa (SD-29.3). */
    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    long countByConjugationFormIdAndStatus(Long conjugationFormId, Question.QuestionStatus status);

    /** Số câu hỏi dùng cho luyện tập (is_exercise_question = TRUE) - BR111. */
    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query("SELECT COUNT(q) FROM Question q WHERE q.conjugationFormId = :formId " +
           "AND q.status = :status AND q.isExerciseQuestion = true")
    long countPracticeQuestions(@Param("formId") Long formId,
                                @Param("status") Question.QuestionStatus status);

    /** SD-29.5: câu hỏi ACTIVE của thể chia, lọc tùy chọn theo mức độ. */
    default List<Question> findForPractice(Long formId, Question.Difficulty difficulty) {
        return findByFormAndDifficulty(formId, difficulty, Question.QuestionStatus.ACTIVE);
    }

    @Query("SELECT q FROM Question q WHERE q.conjugationFormId = :formId AND q.status = :status " +
           "AND (:difficulty IS NULL OR q.difficulty = :difficulty) " +
           "ORDER BY q.displayOrder ASC, q.id ASC")
    List<Question> findByFormAndDifficulty(@Param("formId") Long formId,
                                           @Param("difficulty") Question.Difficulty difficulty,
                                           @Param("status") Question.QuestionStatus status);

    /** SD-29.5: bỏ chọn toàn bộ câu luyện tập của thể chia. */
    @Modifying
    @Query("UPDATE Question q SET q.isExerciseQuestion = false WHERE q.conjugationFormId = :formId")
    void clearExerciseFlags(@Param("formId") Long formId);

    /** SD-29.5: đánh dấu các câu được chọn dùng cho luyện tập. */
    @Modifying
    @Query("UPDATE Question q SET q.isExerciseQuestion = true " +
           "WHERE q.conjugationFormId = :formId AND q.id IN :ids")
    void markExerciseQuestions(@Param("formId") Long formId, @Param("ids") Collection<Long> ids);

    /** SD-29.4, luồng 6b: gỡ liên kết câu hỏi khỏi thể chia, không xóa khỏi ngân hàng câu hỏi. */
    @Modifying
    @Query("UPDATE Question q SET q.conjugationFormId = NULL, q.isExerciseQuestion = false " +
           "WHERE q.conjugationFormId = :formId")
    void unlinkConjugationForm(@Param("formId") Long formId);

    /** UC-23: câu luyện tập (ACTIVE, is_exercise_question) của thể chia, theo thứ tự hiển thị. */
    @Query("SELECT q FROM Question q WHERE q.conjugationFormId = :formId AND q.status = :status " +
           "AND q.isExerciseQuestion = true ORDER BY q.displayOrder ASC, q.id ASC")
    List<Question> findStudentPracticeQuestions(@Param("formId") Long formId,
                                                @Param("status") Question.QuestionStatus status);

    /** Thêm / sửa câu hỏi: chặn trùng nội dung (cùng động từ) trong thể chia. */
    boolean existsByConjugationFormIdAndContentAndStatus(Long conjugationFormId, String content,
                                                         Question.QuestionStatus status);

    boolean existsByConjugationFormIdAndContentAndStatusAndIdNot(Long conjugationFormId, String content,
                                                                 Question.QuestionStatus status, Long id);

    /** Câu mới được xếp sau câu cuối cùng của thể chia. */
    @Query("SELECT COALESCE(MAX(q.displayOrder), 0) FROM Question q WHERE q.conjugationFormId = :formId")
    int findMaxDisplayOrder(@Param("formId") Long formId);
}
