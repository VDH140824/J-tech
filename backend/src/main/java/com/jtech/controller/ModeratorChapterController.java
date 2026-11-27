package com.jtech.controller;

import com.jtech.dto.request.ChapterRequest;
import com.jtech.dto.response.ChapterDetailResponse;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.CourseRepository;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/moderator/courses/{courseId}/chapters")
@PreAuthorize("hasAnyAuthority('MODERATOR', 'ROLE_MODERATOR')")
public class ModeratorChapterController {
    private final CourseRepository courses;
    private final ChapterRepository chapters;

    public ModeratorChapterController(CourseRepository courses, ChapterRepository chapters) {
        this.courses = courses;
        this.chapters = chapters;
    }

    private Course course(Long id) {
        return courses.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học."));
    }

    private Chapter chapter(Long courseId, Long id) {
        return chapters.findByIdAndCourseId(id, courseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương trong khóa học này."));
    }

    private ChapterDetailResponse response(Chapter ch, Course c) {
        return new ChapterDetailResponse(ch.getId(), ch.getChapterNo(), ch.getTitle(), ch.getDescription(),
                ch.getDisplayOrder(), ch.getStatus(), c.getId(), c.getName(), c.getCode());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ChapterDetailResponse> list(@PathVariable Long courseId) {
        Course c = course(courseId);
        return chapters.findByCourseIdOrderByDisplayOrderAscChapterNoAscIdAsc(courseId).stream().map(ch -> response(ch, c)).toList();
    }

    @GetMapping("/{chapterId}")
    @Transactional(readOnly = true)
    public ChapterDetailResponse get(@PathVariable Long courseId, @PathVariable Long chapterId) {
        Course c = course(courseId);
        return response(chapter(courseId, chapterId), c);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ChapterDetailResponse> create(@PathVariable Long courseId, @Valid @RequestBody ChapterRequest request) {
        Course c = course(courseId);
        if (chapters.existsByCourseIdAndChapterNo(courseId, request.chapterNo())) duplicate();
        Chapter ch = new Chapter();
        ch.setCourse(c);
        apply(ch, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response(chapters.saveAndFlush(ch), c));
    }

    @PutMapping("/{chapterId}")
    @Transactional
    public ChapterDetailResponse update(@PathVariable Long courseId, @PathVariable Long chapterId, @Valid @RequestBody ChapterRequest request) {
        Course c = course(courseId);
        Chapter ch = chapter(courseId, chapterId);
        if (chapters.existsByCourseIdAndChapterNoAndIdNot(courseId, request.chapterNo(), chapterId)) duplicate();
        apply(ch, request);
        return response(chapters.saveAndFlush(ch), c);
    }

    @DeleteMapping("/{chapterId}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long courseId, @PathVariable Long chapterId) {
        course(courseId);
        Chapter ch = chapter(courseId, chapterId);
        if (!ch.getLessons().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chương đang có bài học. Hãy ẩn hoặc lưu trữ chương để giữ dữ liệu học tập.");
        }
        chapters.delete(ch);
        // Database foreign keys also protect tests, reading/listening content and study history.
        chapters.flush();
        return ResponseEntity.noContent().build();
    }

    private void apply(Chapter ch, ChapterRequest request) {
        ch.setChapterNo(request.chapterNo());
        ch.setTitle(request.title().trim());
        ch.setDescription(request.description() == null ? null : request.description().trim());
        ch.setDisplayOrder(request.displayOrder());
        ch.setStatus(request.status());
    }

    private void duplicate() {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Số chương đã tồn tại trong khóa học.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason() == null ? "Yêu cầu không hợp lệ." : ex.getReason()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Số chương bị trùng hoặc chương đang có dữ liệu liên quan. Hãy ẩn/lưu trữ chương thay vì xóa."));
    }
}
