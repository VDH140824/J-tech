package com.jtech.dto.response;

import com.jtech.entity.ClassPost;
import com.jtech.entity.User;
import java.sql.Timestamp;
import java.time.LocalDateTime;

public record PostResponse(Long id, Long classroomId, Long authorId, String authorName,
                           String authorAvatar, String title, String content, String attachmentUrl,
                           LocalDateTime dueAt, LocalDateTime createdAt, long commentCount) {
    public static PostResponse fromPost(ClassPost post, User author) {
        return new PostResponse(post.getId(), post.getClassroomId(), post.getAuthorId(),
                author.getFullName(), author.getAvatarUrl(), post.getTitle(), post.getContent(),
                post.getAttachmentUrl(), post.getDueAt(), post.getCreatedAt(), 0);
    }

    public static PostResponse fromQueryRow(Object[] row) {
        return new PostResponse(((Number) row[0]).longValue(), ((Number) row[1]).longValue(),
                ((Number) row[2]).longValue(), (String) row[3], (String) row[4],
                (String) row[5], (String) row[6], (String) row[7],
                toLocalDateTime(row[8]), toLocalDateTime(row[9]), ((Number) row[10]).longValue());
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value == null) return null;
        return value instanceof Timestamp timestamp ? timestamp.toLocalDateTime() : (LocalDateTime) value;
    }
}
