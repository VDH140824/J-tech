package com.jtech.repository;

import com.jtech.entity.VocabularyTestQuestion;
import java.util.List;
import org.springframework.data.jpa.repository.*;

public interface VocabularyTestQuestionRepository
    extends JpaRepository<VocabularyTestQuestion, Long>
{
    @Query(
        "select q from VocabularyTestQuestion q join VocabularyTestQuestionLink l on l.questionId = q.id where l.testId = :testId order by q.displayOrder, q.id"
    )
    List<VocabularyTestQuestion> findForTest(Long testId);

    @Query(
        "select q from VocabularyTestQuestion q join Lesson l on q.lessonId = l.id where l.chapter.id = :chapterId and q.skill = :skill and q.questionType = :type and q.status = :status order by l.lessonNo, q.displayOrder, q.id"
    )
    List<VocabularyTestQuestion> findBankForChapter(
        Long chapterId,
        VocabularyTestQuestion.Skill skill,
        VocabularyTestQuestion.Type type,
        VocabularyTestQuestion.Status status
    );
}
