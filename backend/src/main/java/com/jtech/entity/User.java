package com.jtech.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "user_account")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false, referencedColumnName = "id")
    private Role role;

    @Column(name = "email", nullable = false, unique = true, length = 255, updatable = false)
    private String email;

    @Column(name = "google_sub", unique = true, length = 64)
    private String googleSub;

    @Column(name = "full_name", length = 50)
    private String fullName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "avatar_public_id", length = 255)
    private String avatarPublicId;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20,
            columnDefinition = "ENUM('PENDING','ACTIVE','REJECTED','LOCKED') NOT NULL DEFAULT 'PENDING'")
    @Builder.Default
    private UserStatus status = UserStatus.PENDING;

    @Column(name = "coin_balance", nullable = false, columnDefinition = "INT UNSIGNED NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer coinBalance = 0;

    @Column(name = "current_streak", nullable = false, columnDefinition = "INT UNSIGNED NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer currentStreak = 0;

    @Column(name = "longest_streak", nullable = false, columnDefinition = "INT UNSIGNED NOT NULL DEFAULT 0")
    @Builder.Default
    private Integer longestStreak = 0;

    @Column(name = "last_study_date")
    private LocalDate lastStudyDate;

    @Column(name = "reminder_enabled", nullable = false, columnDefinition = "BOOLEAN NOT NULL DEFAULT FALSE")
    @Builder.Default
    private Boolean reminderEnabled = false;

    @Column(name = "reminder_time", nullable = false, columnDefinition = "TIME NOT NULL DEFAULT '20:00:00'")
    @Builder.Default
    private LocalTime reminderTime = LocalTime.of(20, 0);

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by", referencedColumnName = "id")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    private User createdBy;

    @Column(name = "last_login_at")
    private LocalDateTime lastLogin;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

}
