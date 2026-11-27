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

    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    long countByConjugationFormIdAndStatus(Long conjugationFormId, Question.QuestionStatus status);

    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query("SELECT COUNT(q) FROM Question q WHERE q.conjugationFormId = :formId " +
           "AND q.status = :status AND q.isExerciseQuestion = true")
    long countPracticeQuestions(@Param("formId") Long formId,
                                @Param("status") Question.QuestionStatus status);

    default List<Question> findForPractice(Long formId, Question.Difficulty difficulty) {
        return findByFormAndDifficulty(formId, difficulty, Question.QuestionStatus.ACTIVE);
    }

    @Query("SELECT q FROM Question q WHERE q.conjugationFormId = :formId AND q.status = :status " +
           "AND (:difficulty IS NULL OR q.difficulty = :difficulty) " +
           "ORDER BY q.displayOrder ASC, q.id ASC")
    List<Question> findByFormAndDifficulty(@Param("formId") Long formId,
                                           @Param("difficulty") Question.Difficulty difficulty,
                                           @Param("status") Question.QuestionStatus status);

    @Modifying
    @Query("UPDATE Question q SET q.isExerciseQuestion = false WHERE q.conjugationFormId = :formId")
    void clearExerciseFlags(@Param("formId") Long formId);

    @Modifying
    @Query("UPDATE Question q SET q.isExerciseQuestion = true " +
           "WHERE q.conjugationFormId = :formId AND q.id IN :ids")
    void markExerciseQuestions(@Param("formId") Long formId, @Param("ids") Collection<Long> ids);

    @Modifying
    @Query("UPDATE Question q SET q.conjugationFormId = NULL, q.isExerciseQuestion = false " +
           "WHERE q.conjugationFormId = :formId")
    void unlinkConjugationForm(@Param("formId") Long formId);

    @Query("SELECT q FROM Question q WHERE q.conjugationFormId = :formId AND q.status = :status " +
           "AND q.isExerciseQuestion = true ORDER BY q.displayOrder ASC, q.id ASC")
    List<Question> findStudentPracticeQuestions(@Param("formId") Long formId,
                                                @Param("status") Question.QuestionStatus status);

    boolean existsByConjugationFormIdAndContentAndStatus(Long conjugationFormId, String content,
                                                         Question.QuestionStatus status);

    boolean existsByConjugationFormIdAndContentAndStatusAndIdNot(Long conjugationFormId, String content,
                                                                 Question.QuestionStatus status, Long id);

    @Query("SELECT COALESCE(MAX(q.displayOrder), 0) FROM Question q WHERE q.conjugationFormId = :formId")
    int findMaxDisplayOrder(@Param("formId") Long formId);
}
