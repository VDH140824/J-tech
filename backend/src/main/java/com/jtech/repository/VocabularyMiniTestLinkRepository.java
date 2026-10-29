package com.jtech.repository;
import com.jtech.entity.VocabularyMiniTestLink;
import org.springframework.data.jpa.repository.*;

public interface VocabularyMiniTestLinkRepository extends JpaRepository<VocabularyMiniTestLink, Long> {
    long countByTestId(Long testId);
    boolean existsByQuestionId(Long questionId);
    @Modifying(flushAutomatically = true)
    @Query("delete from VocabularyMiniTestLink l where l.testId = :testId")
    void removeForTest(Long testId);
}
