package com.jtech.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "kanji")
@Getter @Setter @NoArgsConstructor
public class Kanji {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false) private Lesson lesson;
    @Column(name = "character_text", nullable = false, length = 10) private String characterText;
    @Column(name = "sino_vietnamese", length = 50) private String sinoVietnamese;
    @Column(length = 100) private String onyomi;
    @Column(length = 100) private String kunyomi;
    @Column(name = "meaning_vi", nullable = false, length = 255) private String meaningVi;
    @Column(columnDefinition = "TEXT") private String examples;
    @Column(name = "image_url", length = 500) private String imageUrl;
    @Column(name = "image_public_id", length = 255) private String imagePublicId;
    @Column(name = "mnemonic_story", columnDefinition = "TEXT") private String mnemonicStory;
    @Column(name = "display_order", nullable = false) private Integer displayOrder = 0;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Status status = Status.DRAFT;
    @Column(name = "created_by", columnDefinition = "BIGINT UNSIGNED") private Long createdBy;
    @Column(name = "updated_by", columnDefinition = "BIGINT UNSIGNED") private Long updatedBy;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    public enum Status { DRAFT, PUBLISHED, HIDDEN, ARCHIVED }
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}
