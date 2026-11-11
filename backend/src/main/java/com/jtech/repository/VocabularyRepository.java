package com.jtech.repository;

import com.jtech.entity.Course;
import com.jtech.entity.Vocabulary;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {
    boolean existsByLessonIdAndWordIgnoreCase(Long lessonId, String word);
    boolean existsByLessonIdAndWordIgnoreCaseAndIdNot(Long lessonId, String word, Long id);
    List<Vocabulary> findByLessonIdOrderByDisplayOrderAscIdAsc(Long parentId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Vocabulary v where v.lessonId = :lessonId and v.id in :ids order by v.id")
    List<Vocabulary> findForStatusUpdate(Long lessonId, Set<Long> ids);

    @Modifying(clearAutomatically = true)
    @Query("""
        update Vocabulary v set v.status = :status, v.updatedAt = :updatedAt
        where v.lessonId = :lessonId and v.id in :ids and v.status <> :status
        """)
    int updateStatuses(Long lessonId, Set<Long> ids, Course.Status status, LocalDateTime updatedAt);

    @org.springframework.data.jpa.repository.Query(
        "select v from Vocabulary v join Lesson l on l.id = v.lessonId where l.chapter.id = :chapterId and l.skillType = :skill order by l.displayOrder, l.lessonNo, v.displayOrder, v.id"
    )
    List<Vocabulary> findForChapter(Long chapterId, com.jtech.entity.Lesson.SkillType skill);
}
