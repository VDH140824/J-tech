package com.jtech.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "test")
@Getter
@Setter
public class VocabularyTest {

    public enum Type {
        EXERCISE,
        LESSON_TEST,
        CHAPTER_TEST,
    }

    @Converter
    public static class TypeConverter implements AttributeConverter<Type, String> {

        @Override
        public String convertToDatabaseColumn(Type type) {
            if (type == null) return null;
            return type == Type.EXERCISE ? "MINI_TEST" : type.name();
        }

        @Override
        public Type convertToEntityAttribute(String value) {
            if (value == null) return null;
            return value.equals("MINI_TEST") ? Type.EXERCISE : Type.valueOf(value);
        }
    }

    public enum Skill {
        VOCABULARY,
        KANJI,
        GRAMMAR,
        ALL,
    }

    public enum Status {
        DRAFT,
        PUBLISHED,
        ARCHIVED,
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Convert(converter = TypeConverter.class)
    @Column(
            name = "test_type",
            nullable = false,
            columnDefinition = "ENUM('MINI_TEST','LESSON_TEST','CHAPTER_TEST')")
    private Type testType = Type.EXERCISE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Skill skill = Skill.VOCABULARY;

    @Column(name = "lesson_id", columnDefinition = "BIGINT UNSIGNED")
    private Long lessonId;

    @Column(name = "chapter_id", columnDefinition = "BIGINT UNSIGNED")
    private Long chapterId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration_minutes", nullable = false, columnDefinition = "SMALLINT UNSIGNED")
    private Integer durationMinutes;

    @Column(name = "passing_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal passingScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void created() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    void updated() {
        updatedAt = LocalDateTime.now();
    }
}
