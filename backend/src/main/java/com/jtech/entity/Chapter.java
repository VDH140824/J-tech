package com.jtech.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chapter")
@Getter
@Setter
@NoArgsConstructor
public class Chapter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "chapter_no", nullable = false, columnDefinition = "SMALLINT UNSIGNED")
    private Integer chapterNo;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Course.Status status;

    @OneToMany(mappedBy = "chapter", fetch = FetchType.LAZY)
    @OrderBy("displayOrder ASC, lessonNo ASC")
    private List<Lesson> lessons = new ArrayList<>();
}
