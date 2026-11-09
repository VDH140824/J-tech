package com.jtech.repository;

import com.jtech.entity.ClassPost;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<ClassPost, Long> {
    Optional<ClassPost> findByIdAndClassroomId(Long id, Long classroomId);

    @Query(value = "SELECT audio_public_id, audio_url FROM class_post_comment WHERE post_id = :postId AND audio_public_id IS NOT NULL", nativeQuery = true)
    List<Object[]> findCommentAudioAssets(@Param("postId") Long postId);

    @Query(value = """
            SELECT c.id FROM class_post_comment c
            WHERE c.post_id = :postId
              AND NOT EXISTS (SELECT 1 FROM class_post_comment child WHERE child.parent_id = c.id)
            LIMIT 500
            """, nativeQuery = true)
    List<Number> findLeafCommentIds(@Param("postId") Long postId);

    @Modifying
    @Query(value = "DELETE FROM class_post_comment WHERE id IN (:ids)", nativeQuery = true)
    int deleteCommentIds(@Param("ids") List<Long> ids);

    @Query(value = "SELECT COUNT(*) FROM class_post_comment WHERE post_id = :postId", nativeQuery = true)
    long countCommentsByPostId(@Param("postId") Long postId);

    @Query(value = """
            SELECT p.id, p.classroom_id, p.author_id, u.full_name, u.avatar_url,
                   p.title, p.content, p.attachment_url, p.due_at, p.created_at,
                   (SELECT COUNT(*) FROM class_post_comment pc WHERE pc.post_id = p.id)
            FROM class_post p
            JOIN user_account u ON u.id = p.author_id
            WHERE p.classroom_id = :classId
            ORDER BY p.created_at DESC, p.id DESC
            """, nativeQuery = true)
    List<Object[]> findByClassroomOrderByCreatedAtDesc(@Param("classId") Long classId);
}
