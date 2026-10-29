package com.jtech.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity @Table(name = "question") @Getter @Setter
public class VocabularyMiniTestQuestion {
    public enum Skill { VOCABULARY, KANJI, GRAMMAR, LISTENING, CONJUGATION }
    public enum Type { MCQ, FILL_IN, MATCHING }
    public enum Difficulty { EASY, MEDIUM, HARD }
    public enum Status { ACTIVE, ARCHIVED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Skill skill = Skill.VOCABULARY;
    @Enumerated(EnumType.STRING) @Column(name = "question_type", nullable = false) private Type questionType;
    @Column(name = "lesson_id", columnDefinition = "BIGINT UNSIGNED") private Long lessonId;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(columnDefinition = "TEXT") private String explanation;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "answer_data", nullable = false, columnDefinition = "json") private String answerData;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Difficulty difficulty = Difficulty.EASY;
    @Column(name = "is_exercise_question", nullable = false) private Boolean exerciseQuestion = false;
    @Column(name = "display_order", nullable = false, columnDefinition = "SMALLINT UNSIGNED") private Integer displayOrder;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status = Status.ACTIVE;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @PrePersist void created() { createdAt = LocalDateTime.now(); }
    @PreUpdate void updated() { updatedAt = LocalDateTime.now(); }
}
