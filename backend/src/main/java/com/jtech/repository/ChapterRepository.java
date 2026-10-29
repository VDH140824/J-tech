package com.jtech.repository;

import com.jtech.entity.Chapter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Chapter c where c.id = :id")
    java.util.Optional<Chapter> findForUpdate(Long id);
    Optional<Chapter> findByIdAndCourseId(Long id, Long courseId);
}
