package com.jtech.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "question")
@Getter
@Setter
public class Question {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "skill", nullable = false)
    private Skill skill;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false)
    private QuestionType questionType;

    @Column(name = "lesson_id")
    private Long lessonId;

    @Column(name = "listening_exercise_id")
    private Long listeningExerciseId;

    @Column(name = "conjugation_form_id")
    private Long conjugationFormId;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;

    @Column(name = "media_public_id", length = 255)
    private String mediaPublicId;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "answer_data", nullable = false, columnDefinition = "json")
    private String answerData;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", nullable = false)
    private Difficulty difficulty;

    @Column(name = "is_exercise_question", nullable = false,
            columnDefinition = "BOOLEAN NOT NULL DEFAULT TRUE")
    private Boolean isExerciseQuestion;

    @Column(name = "display_order", nullable = false, columnDefinition = "SMALLINT UNSIGNED")
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private QuestionStatus status;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Skill { VOCABULARY, KANJI, GRAMMAR, LISTENING, CONJUGATION }
    public enum QuestionType { MCQ, FILL_IN, MATCHING }
    public enum Difficulty { EASY, MEDIUM, HARD }
    public enum QuestionStatus { ACTIVE, ARCHIVED }
}
