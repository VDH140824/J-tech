package com.jtech.repository;

import com.jtech.entity.Chapter;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {
    @org.springframework.data.jpa.repository.Lock(
        jakarta.persistence.LockModeType.PESSIMISTIC_WRITE
    )
    @org.springframework.data.jpa.repository.Query("select c from Chapter c where c.id = :id")
    java.util.Optional<Chapter> findForUpdate(Long id);

    Optional<Chapter> findByIdAndCourseId(Long id, Long courseId);
}
