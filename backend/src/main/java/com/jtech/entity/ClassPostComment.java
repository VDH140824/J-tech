package com.jtech.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "class_post_comment")
@Getter
@Setter
public class ClassPostComment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED")
    private Long id;
    @Column(name = "post_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Long postId;
    @Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
    private Long userId;
    @Column(columnDefinition = "TEXT")
    private String content;
    @Column(name = "audio_url", length = 500)
    private String audioUrl;
    @Column(name = "audio_public_id", length = 255)
    private String audioPublicId;
    @Column(name = "parent_id", columnDefinition = "BIGINT UNSIGNED")
    private Long parentId;
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
