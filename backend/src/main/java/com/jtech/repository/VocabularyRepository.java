package com.jtech.repository;

import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
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

    @Query("""
        select v from Vocabulary v join Lesson owner on owner.id = v.lessonId
        where owner.chapter.id = (select anchor.chapter.id from Lesson anchor where anchor.id = :lessonId)
          and owner.skillType = :skill
        order by owner.displayOrder, owner.lessonNo, v.displayOrder, v.id
        """)
    List<Vocabulary> findForChapterByLessonId(Long lessonId, Lesson.SkillType skill);

    @Query("""
        select case when count(v) > 0 then true else false end
        from Vocabulary v join Lesson owner on owner.id = v.lessonId
        where owner.chapter.id = (select anchor.chapter.id from Lesson anchor where anchor.id = :lessonId)
          and owner.skillType = :skill and lower(v.word) = lower(:word)
        """)
    boolean existsInChapterByLessonIdAndWordIgnoreCase(Long lessonId, String word, Lesson.SkillType skill);

    @Query("""
        select case when count(v) > 0 then true else false end
        from Vocabulary v join Lesson owner on owner.id = v.lessonId
        where owner.chapter.id = (select anchor.chapter.id from Lesson anchor where anchor.id = :lessonId)
          and owner.skillType = :skill and lower(v.word) = lower(:word) and v.id <> :id
        """)
    boolean existsInChapterByLessonIdAndWordIgnoreCaseAndIdNot(
        Long lessonId, String word, Lesson.SkillType skill, Long id
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Vocabulary v where v.lessonId = :lessonId and v.id in :ids order by v.id")
    List<Vocabulary> findForStatusUpdate(Long lessonId, Set<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select v from Vocabulary v join Lesson owner on owner.id = v.lessonId
        where owner.chapter.id = (select anchor.chapter.id from Lesson anchor where anchor.id = :lessonId)
          and owner.skillType = :skill and v.id in :ids
        order by v.id
        """)
    List<Vocabulary> findForChapterStatusUpdate(Long lessonId, Set<Long> ids, Lesson.SkillType skill);

    @Modifying(clearAutomatically = true)
    @Query("""
        update Vocabulary v set v.status = :status, v.updatedAt = :updatedAt
        where v.lessonId = :lessonId and v.id in :ids and v.status <> :status
        """)
    int updateStatuses(Long lessonId, Set<Long> ids, Course.Status status, LocalDateTime updatedAt);

    @Modifying(clearAutomatically = true)
    @Query("""
        update Vocabulary v set v.status = :status, v.updatedAt = :updatedAt
        where v.id in :ids
          and v.lessonId in (
              select owner.id from Lesson owner
              where owner.chapter.id = (select anchor.chapter.id from Lesson anchor where anchor.id = :lessonId)
                and owner.skillType = :skill
          )
          and v.status <> :status
        """)
    int updateChapterStatuses(
        Long lessonId, Set<Long> ids, Lesson.SkillType skill, Course.Status status, LocalDateTime updatedAt
    );

    @org.springframework.data.jpa.repository.Query(
        "select v from Vocabulary v join Lesson l on l.id = v.lessonId where l.chapter.id = :chapterId and l.skillType = :skill order by l.displayOrder, l.lessonNo, v.displayOrder, v.id"
    )
    List<Vocabulary> findForChapter(Long chapterId, com.jtech.entity.Lesson.SkillType skill);
}
