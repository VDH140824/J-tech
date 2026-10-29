package com.jtech.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
@Entity @Table(name = "vocabulary") @Getter @Setter
public class Vocabulary {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED")
    private Long id;
    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private Course.Status status = Course.Status.DRAFT;
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @PrePersist
    public void createTimestamp() { createdAt = LocalDateTime.now(); }
    @PreUpdate
    public void updateTimestamp() { updatedAt = LocalDateTime.now(); }
    // A vocabulary entry survives deletion of its lesson and can be assigned again.
    @Column(name = "lesson_id", columnDefinition = "BIGINT UNSIGNED")
    private Long lessonId;
    @Column(name = "word", length = 100, nullable = false)
    private String word;
    @Column(name = "reading", length = 100, nullable = false)
    private String reading;
    @Column(name = "meaning_vi", length = 255, nullable = false)
    private String meaningVi;
    @Column(name = "word_type", length = 50)
    private String wordType;
    @Column(name = "example_jp", length = 500)
    private String exampleJp;
    @Column(name = "example_vi", length = 500)
    private String exampleVi;
    @Column(name = "audio_url", length = 500)
    private String audioUrl;
    @Column(name = "audio_public_id", length = 255)
    private String audioPublicId;
}
