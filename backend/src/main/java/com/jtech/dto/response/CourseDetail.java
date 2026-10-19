package com.jtech.dto.response; import java.util.List; public record CourseDetail(Long id,String code,String name,String description,String thumbnailUrl,List<ChapterSummary> chapters) {}
