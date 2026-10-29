package com.jtech.repository;
import com.jtech.entity.VocabularyMiniTestQuestion;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface VocabularyMiniTestQuestionRepository extends JpaRepository<VocabularyMiniTestQuestion, Long> {
    @Query("select q from VocabularyMiniTestQuestion q join VocabularyMiniTestLink l on l.questionId = q.id where l.testId = :testId order by q.displayOrder, q.id")
    List<VocabularyMiniTestQuestion> findForTest(Long testId);
    @Query("select q from VocabularyMiniTestQuestion q join Lesson l on q.lessonId = l.id where l.chapter.id = :chapterId and q.skill = :skill and q.questionType = :type and q.status = :status and q.exerciseQuestion = false order by l.lessonNo, q.displayOrder, q.id")
    List<VocabularyMiniTestQuestion> findBankForChapter(Long chapterId, VocabularyMiniTestQuestion.Skill skill, VocabularyMiniTestQuestion.Type type, VocabularyMiniTestQuestion.Status status);
}
