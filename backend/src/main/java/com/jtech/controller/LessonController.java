package com.jtech.controller;

import com.jtech.dto.request.LessonRequest;
import com.jtech.dto.response.LessonResponse;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.service.LessonService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
public class LessonController {

    private final LessonService lessonService;

    public LessonController(LessonService lessonService) {
        this.lessonService = lessonService;
    }

    @GetMapping("/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsByChapter(
        @PathVariable Long chapterId,
        @RequestParam(required = false) Lesson.SkillType skillType,
        @RequestParam(required = false) Course.Status status
    ) {
        return ResponseEntity.ok(lessonService.getLessonsByChapter(chapterId, skillType, status));
    }

    @GetMapping("/courses/{courseId}/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsByCourseAndChapter(
        @PathVariable Long courseId,
        @PathVariable Long chapterId,
        @RequestParam(required = false) Lesson.SkillType skillType,
        @RequestParam(required = false) Course.Status status
    ) {
        return ResponseEntity.ok(
            lessonService.getLessonsByCourseAndChapter(courseId, chapterId, skillType, status)
        );
    }

    @GetMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> getLessonById(@PathVariable Long id) {
        return ResponseEntity.ok(lessonService.getLessonById(id));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping({
        "/chapters/{chapterId}/lessons",
        "/courses/{courseId}/chapters/{chapterId}/lessons",
    })
    public ResponseEntity<LessonResponse> createLesson(
        @PathVariable(required = false) Long courseId,
        @PathVariable Long chapterId,
        @Valid @RequestPart("request") LessonRequest request,
        @RequestPart(
            value = "file",
            required = false
        ) org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
            lessonService.createLesson(courseId, chapterId, request, file)
        );
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> updateLesson(
        @PathVariable Long id,
        @Valid @RequestPart("request") LessonRequest request,
        @RequestPart(
            value = "file",
            required = false
        ) org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.ok(lessonService.updateLesson(id, request, file));
    }

    public record VocabularyDocumentNameRequest(
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 4000) String url,
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 200) String name
    ) {}

    public record VocabularyDocumentDeleteRequest(
        @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max = 4000) String url
    ) {}

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping(value = "/moderator/vocabulary/lessons/{lessonId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LessonResponse> uploadVocabularyPdf(
        @PathVariable Long lessonId,
        @RequestPart("file") org.springframework.web.multipart.MultipartFile file,
        @RequestPart("name") String name
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(lessonService.uploadVocabularyPdf(lessonId, file, name));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PatchMapping("/moderator/vocabulary/lessons/{lessonId}/documents/name")
    public ResponseEntity<LessonResponse> renameVocabularyPdf(
        @PathVariable Long lessonId,
        @Valid @RequestBody VocabularyDocumentNameRequest request
    ) {
        return ResponseEntity.ok(lessonService.renameVocabularyPdf(lessonId, request.url(), request.name()));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/moderator/vocabulary/lessons/{lessonId}/documents")
    public ResponseEntity<LessonResponse> deleteVocabularyPdf(
        @PathVariable Long lessonId,
        @Valid @RequestBody VocabularyDocumentDeleteRequest request
    ) {
        return ResponseEntity.ok(lessonService.deleteVocabularyPdf(lessonId, request.url()));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        lessonService.deleteLesson(id);
        return ResponseEntity.noContent().build();
    }
}
