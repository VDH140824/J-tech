package com.jtech.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "grammar")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Grammar {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "structure_name", nullable = false, length = 150)
    private String structureName;

    @Column(name = "meaning_vi", nullable = false, length = 255)
    private String meaningVi;

    @Column(name = "usage_explanation", nullable = false, columnDefinition = "TEXT")
    private String usageExplanation;

    @Column(name = "example_jp", nullable = false, columnDefinition = "TEXT")
    private String exampleJp;

    @Column(name = "example_vi", nullable = false, columnDefinition = "TEXT")
    private String exampleVi;

    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @Column(name = "video_public_id", length = 255)
    private String videoPublicId;

    @Column(name = "video_duration_sec", columnDefinition = "INT UNSIGNED")
    private Integer videoDurationSec;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status { DRAFT, PUBLISHED, HIDDEN, ARCHIVED }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (displayOrder == null) displayOrder = 0;
        if (status == null) status = Status.DRAFT;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
