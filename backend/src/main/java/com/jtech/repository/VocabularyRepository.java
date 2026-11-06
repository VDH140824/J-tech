package com.jtech.repository;

import com.jtech.entity.Vocabulary;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VocabularyRepository extends JpaRepository<Vocabulary, Long> {
    boolean existsByLessonIdAndWordIgnoreCase(Long lessonId, String word);
    boolean existsByLessonIdAndWordIgnoreCaseAndIdNot(Long lessonId, String word, Long id);
    List<Vocabulary> findByLessonIdOrderByDisplayOrderAscIdAsc(Long parentId);

    @org.springframework.data.jpa.repository.Query(
        "select v from Vocabulary v join Lesson l on l.id = v.lessonId where l.chapter.id = :chapterId and l.skillType = :skill order by l.displayOrder, l.lessonNo, v.displayOrder, v.id"
    )
    List<Vocabulary> findForChapter(Long chapterId, com.jtech.entity.Lesson.SkillType skill);
}
