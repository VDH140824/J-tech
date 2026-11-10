package com.jtech.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Bảng conjugation_form trong doc/jtech.sql.
 * Dùng chung Course.Status (DRAFT / PUBLISHED / HIDDEN / ARCHIVED) như Lesson và Chapter.
 */
@Entity
@Table(name = "conjugation_form")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConjugationForm {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(name = "name_vi", nullable = false, length = 100)
    private String nameVi;

    @Column(name = "name_jp", nullable = false, length = 100)
    private String nameJp;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "material_content", nullable = false, columnDefinition = "MEDIUMTEXT")
    private String materialContent;

    // SMALLINT UNSIGNED: khai báo columnDefinition giống Lesson.lessonNo để qua được ddl-auto: validate
    @Column(name = "questions_per_practice", nullable = false, columnDefinition = "SMALLINT UNSIGNED")
    @Builder.Default
    private Integer questionsPerPractice = 10;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Course.Status status = Course.Status.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by", referencedColumnName = "id")
    private User updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now(VN_ZONE);
        if (displayOrder == null) displayOrder = 0;
        if (status == null) status = Course.Status.DRAFT;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now(VN_ZONE);
    }
}
