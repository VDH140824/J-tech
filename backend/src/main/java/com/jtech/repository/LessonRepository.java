package com.jtech.repository;

import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findByChapterIdOrderByDisplayOrderAscLessonNoAscIdAsc(Long chapterId);
    List<Lesson> findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(Long chapterId, Lesson.SkillType skillType);
    List<Lesson> findByChapterIdAndSkillTypeAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(Long chapterId, Lesson.SkillType skillType, Course.Status status);
    List<Lesson> findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(Long chapterId, Course.Status status);
    boolean existsByChapterIdAndSkillTypeAndDisplayOrder(Long chapterId, Lesson.SkillType skillType, Integer displayOrder);
    boolean existsByChapterIdAndSkillTypeAndDisplayOrderAndIdNot(Long chapterId, Lesson.SkillType skillType, Integer displayOrder, Long id);
    Optional<Lesson> findByIdAndChapterId(Long id, Long chapterId);
}
