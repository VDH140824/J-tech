package com.jtech.repository;

import com.jtech.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ClassRepository extends JpaRepository<Classroom, Long> {
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);

    @Query(value = "SELECT COUNT(*) FROM classroom_member WHERE classroom_id = :id", nativeQuery = true)
    long countStudents(@Param("id") Long id);
    @Query(value = "SELECT COUNT(*) FROM class_post WHERE classroom_id = :id", nativeQuery = true)
    long countPosts(@Param("id") Long id);
    @Query(value = """
            SELECT c.id, c.code, c.moderator_id, c.description, c.status,
                   c.created_at, COUNT(m.id)
            FROM classroom c
            LEFT JOIN classroom_member m ON m.classroom_id = c.id
            WHERE c.moderator_id = :moderatorId
            GROUP BY c.id, c.code, c.moderator_id, c.description, c.status, c.created_at
            ORDER BY c.created_at DESC, c.id DESC
            """, nativeQuery = true)
    List<Object[]> findByModeratorId(@Param("moderatorId") Long moderatorId);
}
