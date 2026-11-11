package com.jtech.repository;

import com.jtech.dto.response.StudentResponse;
import com.jtech.entity.ClassroomMember;
import com.jtech.entity.UserStatus;
import java.util.Set;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClassMemberRepository extends JpaRepository<ClassroomMember, Long> {
    @Query(value = """
            SELECT c.id,c.code,c.moderator_id,c.description,c.status,c.created_at,
                   (SELECT COUNT(*) FROM classroom_member members WHERE members.classroom_id=c.id)
            FROM classroom_member m JOIN classroom c ON c.id=m.classroom_id
            WHERE m.student_id=:studentId AND c.status IN ('ACTIVE','ARCHIVED')
            ORDER BY c.created_at DESC,c.id DESC
            """, nativeQuery = true)
    java.util.List<Object[]> findStudentClasses(@Param("studentId") Long studentId);
    Optional<ClassroomMember> findByClassroom_IdAndStudent_UserId(Long classId, Long studentId);

    @Query("SELECT m.student.userId FROM ClassroomMember m WHERE m.classroom.id = :classId AND m.student.userId IN :studentIds")
    Set<Long> findExistingStudentIds(@Param("classId") Long classId,
            @Param("studentIds") Set<Long> studentIds);

    @Query(value = """
            SELECT new com.jtech.dto.response.StudentResponse(
                u.userId, u.fullName, u.email, u.avatarUrl, u.status, m.joinedAt)
            FROM ClassroomMember m JOIN m.student u
            WHERE m.classroom.id = :classId
              AND (u.role.roleName = 'STUDENT')
              AND (:search = '' OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:status IS NULL OR u.status = :status)
            ORDER BY m.joinedAt DESC, m.id DESC
            """, countQuery = """
            SELECT COUNT(m) FROM ClassroomMember m JOIN m.student u
            WHERE m.classroom.id = :classId
              AND (u.role.roleName = 'STUDENT')
              AND (:search = '' OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:status IS NULL OR u.status = :status)
            """)
    Page<StudentResponse> findStudentsByClassId(@Param("classId") Long classId,
            @Param("search") String search, @Param("status") UserStatus status, Pageable pageable);
}
