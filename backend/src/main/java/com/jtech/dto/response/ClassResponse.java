package com.jtech.dto.response;

import com.jtech.entity.ClassroomStatus;
import com.jtech.entity.Classroom;
import java.sql.Timestamp;
import java.time.LocalDateTime;

public record ClassResponse(Long id, String code, Long moderatorId, String description,
                            ClassroomStatus status, LocalDateTime createdAt, long studentCount) {
    public static ClassResponse fromClassroom(Classroom classroom) {
        return fromClassroom(classroom, 0);
    }
    public static ClassResponse fromClassroom(Classroom classroom, long studentCount) {
        return new ClassResponse(classroom.getId(), classroom.getCode(), classroom.getModeratorId(),
                classroom.getDescription(), classroom.getStatus(), classroom.getCreatedAt(), studentCount);
    }
    public static ClassResponse fromQueryRow(Object[] row) {
        LocalDateTime createdAt = row[5] instanceof Timestamp timestamp
                ? timestamp.toLocalDateTime() : (LocalDateTime) row[5];
        return new ClassResponse(((Number) row[0]).longValue(), (String) row[1],
                ((Number) row[2]).longValue(), (String) row[3],
                ClassroomStatus.valueOf(row[4].toString()), createdAt,
                ((Number) row[6]).longValue());
    }
}
