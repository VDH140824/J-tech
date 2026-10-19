package com.jtech.repository;

import com.jtech.entity.Course;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {
    @EntityGraph(attributePaths = "chapters")
    List<Course> findByStatusOrderByDisplayOrderAscIdAsc(Course.Status status);
    @EntityGraph(attributePaths = "chapters")
    Optional<Course> findByIdAndStatus(Long id, Course.Status status);
}
