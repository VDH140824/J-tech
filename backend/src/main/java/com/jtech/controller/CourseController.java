package com.jtech.controller;

import com.jtech.dto.response.ChapterDetailResponse;
import com.jtech.dto.response.ChapterSummary;
import com.jtech.dto.response.CourseDetail;
import com.jtech.dto.response.CourseSummary;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.CourseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/courses")
public class CourseController {

    private final CourseRepository repository;
    private final ChapterRepository chapterRepository;

    public CourseController(CourseRepository repository, ChapterRepository chapterRepository) {
        this.repository = repository;
        this.chapterRepository = chapterRepository;
    }

    @GetMapping
    public List<CourseSummary> getCourses() {
        return repository.findByStatusOrderByDisplayOrderAscIdAsc(Course.Status.PUBLISHED).stream()
                .map(c -> new CourseSummary(
                        c.getId(),
                        c.getCode(),
                        c.getName(),
                        c.getDescription(),
                        c.getThumbnailUrl(),
                        c.getChapters().stream().filter(ch -> ch.getStatus() == Course.Status.PUBLISHED).count()
                ))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDetail> getCourse(@PathVariable Long id) {
        return repository.findByIdAndStatus(id, Course.Status.PUBLISHED)
                .map(c -> ResponseEntity.ok(new CourseDetail(
                        c.getId(),
                        c.getCode(),
                        c.getName(),
                        c.getDescription(),
                        c.getThumbnailUrl(),
                        c.getChapters().stream()
                                .filter(ch -> ch.getStatus() == Course.Status.PUBLISHED)
                                .map(ch -> new ChapterSummary(ch.getId(), ch.getChapterNo(), ch.getTitle(), ch.getDescription()))
                                .toList()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{courseId}/chapters/{chapterId}")
    public ResponseEntity<ChapterDetailResponse> getChapter(
            @PathVariable Long courseId,
            @PathVariable Long chapterId
    ) {
        return chapterRepository.findByIdAndCourseId(chapterId, courseId)
                .map(chapter -> {
                    Course course = chapter.getCourse();
                    return ResponseEntity.ok(new ChapterDetailResponse(
                            chapter.getId(),
                            chapter.getChapterNo(),
                            chapter.getTitle(),
                            chapter.getDescription(),
                            chapter.getDisplayOrder(),
                            chapter.getStatus(),
                            course != null ? course.getId() : courseId,
                            course != null ? course.getName() : null,
                            course != null ? course.getCode() : null
                    ));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
