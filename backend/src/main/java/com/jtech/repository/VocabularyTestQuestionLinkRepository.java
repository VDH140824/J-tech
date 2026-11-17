package com.jtech.repository;

import com.jtech.entity.VocabularyTestQuestionLink;
import org.springframework.data.jpa.repository.*;

public interface VocabularyTestQuestionLinkRepository
    extends JpaRepository<VocabularyTestQuestionLink, Long>
{
    long countByTestId(Long testId);
    boolean existsByQuestionId(Long questionId);

    @Modifying(flushAutomatically = true)
    @Query("delete from VocabularyTestQuestionLink l where l.testId = :testId")
    void removeForTest(Long testId);
}
