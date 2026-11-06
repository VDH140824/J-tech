package com.jtech.dto.response;

import java.util.List;

public record StudentChapterList(Long id, String name, String description, List<Chapter> chapters) {
    public record Chapter(Long id, int chapterNo, String title, String description,
                          int testCount, List<Lesson> lessons) {}
    public record Lesson(Long id, int lessonNo, String title, String skillType,
                         int itemCount, int videoCount, long durationSeconds,
                         int exerciseCount, int testCount, boolean completed) {}
}
