package com.jtech.repository;

import com.jtech.entity.ClassPostComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<ClassPostComment, Long> {
    Optional<ClassPostComment> findByIdAndPostId(Long id, Long postId);

    @Query(value = """
            SELECT c.id, c.post_id, c.user_id, u.full_name, u.avatar_url,
                   c.content, c.audio_url, c.parent_id, c.created_at, c.updated_at
            FROM class_post_comment c JOIN user_account u ON u.id = c.user_id
            WHERE c.post_id = :postId ORDER BY c.created_at ASC, c.id ASC
            """, nativeQuery = true)
    List<Object[]> findThreadRows(@Param("postId") Long postId);
}
