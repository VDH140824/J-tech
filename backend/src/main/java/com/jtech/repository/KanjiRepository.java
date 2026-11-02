package com.jtech.repository;

import com.jtech.entity.Kanji;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface KanjiRepository extends JpaRepository<Kanji, Long>, JpaSpecificationExecutor<Kanji> {
    boolean existsByLessonIdAndCharacterText(Long lessonId, String characterText);
    boolean existsByLessonIdAndCharacterTextAndIdNot(Long lessonId, String characterText, Long id);
    @Query("select coalesce(max(k.displayOrder), 0) from Kanji k where k.lesson.id = :lessonId")
    int findMaxDisplayOrder(@Param("lessonId") Long lessonId);
}
