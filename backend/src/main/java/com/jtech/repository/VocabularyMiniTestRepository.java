package com.jtech.repository;
import com.jtech.entity.VocabularyMiniTest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.List;
import java.util.Optional;

public interface VocabularyMiniTestRepository extends JpaRepository<VocabularyMiniTest, Long> {
    List<VocabularyMiniTest> findByLessonIdAndTestTypeAndSkillOrderByIdDesc(Long lessonId, VocabularyMiniTest.Type type, VocabularyMiniTest.Skill skill);
    List<VocabularyMiniTest> findByChapterIdAndTestTypeAndSkillOrderByIdDesc(Long chapterId, VocabularyMiniTest.Type type, VocabularyMiniTest.Skill skill);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from VocabularyMiniTest t where t.id = :id")
    Optional<VocabularyMiniTest> findForUpdate(Long id);
    @Query(value = "select count(*) from test_attempt where test_id = :id", nativeQuery = true)
    long countAttempts(Long id);
    @Query(value = "select count(*) from test_attempt where test_id = :id and status = 'IN_PROGRESS' and deadline_at > CURRENT_TIMESTAMP", nativeQuery = true)
    long countActiveAttempts(Long id);
}
