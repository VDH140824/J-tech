package com.jtech.controller;

import com.jtech.dto.response.LessonResponse;
import com.jtech.entity.Course;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
public class ChapterStudyController {
    private final ChapterRepository chapters;
    private final LessonRepository lessons;

    public ChapterStudyController(ChapterRepository chapters, LessonRepository lessons) {
        this.chapters = chapters; this.lessons = lessons;
    }

    public record ChapterStudy(Long id, Integer chapterNo, String title, String description,
            Long courseId, String courseName, List<LessonResponse> lessons) {}

    @Transactional(readOnly = true)
    @GetMapping("/courses/{courseId}/chapters/{chapterId}/study")
    public ChapterStudy get(@PathVariable Long courseId, @PathVariable Long chapterId) {
        var chapter = chapters.findByIdAndCourseId(chapterId, courseId)
            .orElseThrow(this::notFound);
        if (chapter.getStatus() != Course.Status.PUBLISHED || chapter.getCourse().getStatus() != Course.Status.PUBLISHED)
            throw notFound();
        var items = lessons.findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId, Course.Status.PUBLISHED)
            .stream().map(lesson -> new LessonResponse(lesson.getId(), chapterId, lesson.getSkillType(),
                lesson.getLessonNo(), lesson.getTitle(), lesson.getDescription(), lesson.getDocuments(),
                lesson.getDisplayOrder(), lesson.getStatus(), lesson.getCreatedAt(), lesson.getUpdatedAt())).toList();
        return new ChapterStudy(chapter.getId(), chapter.getChapterNo(), chapter.getTitle(), chapter.getDescription(),
            courseId, chapter.getCourse().getName(), items);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Chương không tồn tại hoặc chưa được xuất bản.");
    }
}
