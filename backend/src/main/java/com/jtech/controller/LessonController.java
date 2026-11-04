package com.jtech.controller;

import com.jtech.dto.request.LessonRequest;
import com.jtech.dto.response.LessonResponse;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.service.LessonService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
public class LessonController {
    private final LessonService lessonService;

    public LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @GetMapping("/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsByChapter(
            @PathVariable Long chapterId, @RequestParam(required = false) Lesson.SkillType skillType,
            @RequestParam(required = false) Course.Status status) {
        return ResponseEntity.ok(lessonService.getLessonsByChapter(chapterId, skillType, status));
    }

    @GetMapping("/courses/{courseId}/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsByCourseAndChapter(
            @PathVariable Long courseId, @PathVariable Long chapterId,
            @RequestParam(required = false) Lesson.SkillType skillType,
            @RequestParam(required = false) Course.Status status) {
        return ResponseEntity.ok(lessonService.getLessonsByCourseAndChapter(courseId, chapterId, skillType, status));
    }

    @GetMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> getLessonById(@PathVariable Long id) {
        return ResponseEntity.ok(lessonService.getLessonById(id));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping({"/chapters/{chapterId}/lessons", "/courses/{courseId}/chapters/{chapterId}/lessons"})
    public ResponseEntity<LessonResponse> createLesson(@PathVariable(required = false) Long courseId,
            @PathVariable Long chapterId, @Valid @RequestPart("request") LessonRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lessonService.createLesson(courseId, chapterId, request, file));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> updateLesson(@PathVariable Long id, @Valid @RequestPart("request") LessonRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(lessonService.updateLesson(id, request, file));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        lessonService.deleteLesson(id);
        return ResponseEntity.noContent().build();
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handleLessonError(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(exception.getReason());
    }
}
