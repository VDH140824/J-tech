package com.jtech.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name = "test") @Getter @Setter
public class VocabularyMiniTest {
    public enum Type { MINI_TEST, LESSON_TEST, CHAPTER_TEST }
    public enum Skill { VOCABULARY, KANJI, GRAMMAR, ALL }
    public enum Status { DRAFT, PUBLISHED, ARCHIVED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @Enumerated(EnumType.STRING) @Column(name = "test_type", nullable = false) private Type testType = Type.MINI_TEST;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Skill skill = Skill.VOCABULARY;
    @Column(name = "lesson_id", columnDefinition = "BIGINT UNSIGNED") private Long lessonId;
    @Column(name = "chapter_id", columnDefinition = "BIGINT UNSIGNED") private Long chapterId;
    @Column(nullable = false, length = 200) private String title;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "duration_minutes", nullable = false, columnDefinition = "SMALLINT UNSIGNED") private Integer durationMinutes;
    @Column(name = "passing_score", nullable = false, precision = 5, scale = 2) private BigDecimal passingScore;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status = Status.DRAFT;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @PrePersist void created() { createdAt = LocalDateTime.now(); }
    @PreUpdate void updated() { updatedAt = LocalDateTime.now(); }
}
