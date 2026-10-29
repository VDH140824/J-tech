package com.jtech.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity @Table(name = "test_question") @Getter @Setter
public class VocabularyMiniTestLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED") private Long id;
    @Column(name = "test_id", nullable = false, columnDefinition = "BIGINT UNSIGNED") private Long testId;
    @Column(name = "question_id", nullable = false, columnDefinition = "BIGINT UNSIGNED") private Long questionId;
    @Enumerated(EnumType.STRING) @Column(name = "part_type", nullable = false) private PartType partType = PartType.VOCABULARY;
    public enum PartType { VOCABULARY, KANJI, GRAMMAR }
}
