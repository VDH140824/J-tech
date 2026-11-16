package com.jtech.repository;

import com.jtech.entity.VocabularyTest;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface VocabularyTestRepository extends JpaRepository<VocabularyTest, Long> {
    List<VocabularyTest> findByLessonIdAndTestTypeAndSkillOrderByIdDesc(
        Long lessonId,
        VocabularyTest.Type type,
        VocabularyTest.Skill skill
    );
    List<VocabularyTest> findByChapterIdAndTestTypeAndSkillOrderByIdDesc(
        Long chapterId,
        VocabularyTest.Type type,
        VocabularyTest.Skill skill
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from VocabularyTest t where t.id = :id")
    Optional<VocabularyTest> findForUpdate(Long id);

    @Query(value = "select count(*) from test_attempt where test_id = :id", nativeQuery = true)
    long countAttempts(Long id);

    @Query(
        value = "select count(*) from test_attempt where test_id = :id and status = 'IN_PROGRESS' and deadline_at > CURRENT_TIMESTAMP",
        nativeQuery = true
    )
    long countActiveAttempts(Long id);
}
