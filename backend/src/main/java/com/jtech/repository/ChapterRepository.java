package com.jtech.repository;

import com.jtech.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    Optional<Chapter> findByIdAndCourseId(Long id, Long courseId);
}
