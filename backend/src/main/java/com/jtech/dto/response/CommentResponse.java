package com.jtech.dto.response;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

public record CommentResponse(Long id, Long postId, Long userId, String commenterName,
        String commenterAvatar, String content, String attachmentUrl, Long parentId,
        LocalDateTime createdAt, LocalDateTime updatedAt, boolean deleted,
        List<CommentResponse> replies) {
    public static CommentResponse fromRow(Object[] row, List<CommentResponse> replies) {
        String content = (String) row[5];
        String attachmentUrl = (String) row[6];
        boolean deleted = content == null && attachmentUrl == null;
        return new CommentResponse(number(row[0]), number(row[1]), number(row[2]),
                (String) row[3], (String) row[4], deleted ? null : content,
                deleted ? null : attachmentUrl, number(row[7]), date(row[8]), date(row[9]),
                deleted, replies);
    }
    private static Long number(Object value) { return value == null ? null : ((Number) value).longValue(); }
    private static LocalDateTime date(Object value) {
        return value == null ? null : value instanceof Timestamp timestamp
                ? timestamp.toLocalDateTime() : (LocalDateTime) value;
    }
}
