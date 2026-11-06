package com.jtech.repository;

import com.jtech.entity.Course;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    @org.springframework.data.jpa.repository.Query(value = """
            select new com.jtech.dto.response.ModeratorCourseSummary(
                c.id, c.code, c.name, c.description, c.thumbnailUrl, c.status,
                count(distinct ch.id), count(distinct l.id))
            from Course c left join c.chapters ch left join ch.lessons l
            where (:status is null or c.status = :status)
              and (lower(c.name) like :query escape '!' or lower(c.code) like :query escape '!')
            group by c.id, c.code, c.name, c.description, c.thumbnailUrl, c.status, c.displayOrder
            order by c.displayOrder asc, c.id asc
            """, countQuery = """
            select count(c) from Course c
            where (:status is null or c.status = :status)
              and (lower(c.name) like :query escape '!' or lower(c.code) like :query escape '!')
            """)
    org.springframework.data.domain.Page<com.jtech.dto.response.ModeratorCourseSummary> findForModerator(
            @org.springframework.data.repository.query.Param("query") String query,
            @org.springframework.data.repository.query.Param("status") Course.Status status,
            org.springframework.data.domain.Pageable pageable);

    @EntityGraph(attributePaths = "chapters")
    Optional<Course> findOneById(Long id);
    @EntityGraph(attributePaths = "chapters")
    List<Course> findByStatusOrderByDisplayOrderAscIdAsc(Course.Status status);
    @EntityGraph(attributePaths = "chapters")
    Optional<Course> findByIdAndStatus(Long id, Course.Status status);
}
