package com.jtech.repository;

import com.jtech.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    java.util.List<Chapter> findByCourseIdOrderByDisplayOrderAscChapterNoAscIdAsc(Long courseId);
    boolean existsByCourseIdAndChapterNo(Long courseId, Integer chapterNo);
    boolean existsByCourseIdAndChapterNoAndIdNot(Long courseId, Integer chapterNo, Long id);
    Optional<Chapter> findByIdAndCourseId(Long id, Long courseId);
}
