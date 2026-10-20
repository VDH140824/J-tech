package com.jtech.controller;

import com.jtech.dto.request.LessonRequest;
import com.jtech.dto.response.LessonResponse;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class LessonController {

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;

    public LessonController(LessonRepository lessonRepository, ChapterRepository chapterRepository) {
        this.lessonRepository = lessonRepository;
        this.chapterRepository = chapterRepository;
    }

    @GetMapping("/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsByChapter(
            @PathVariable Long chapterId,
            @RequestParam(required = false) Lesson.SkillType skillType,
            @RequestParam(required = false) Course.Status status
    ) {
        List<Lesson> lessons;
        if (skillType != null && status != null) {
            lessons = lessonRepository.findByChapterIdAndSkillTypeAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId, skillType, status);
        } else if (skillType != null) {
            lessons = lessonRepository.findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId, skillType);
        } else if (status != null) {
            lessons = lessonRepository.findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId, status);
        } else {
            lessons = lessonRepository.findByChapterIdOrderByDisplayOrderAscLessonNoAscIdAsc(chapterId);
        }

        List<LessonResponse> responses = lessons.stream()
                .map(this::mapToResponse)
                .toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/courses/{courseId}/chapters/{chapterId}/lessons")
    public ResponseEntity<List<LessonResponse>> getLessonsByCourseAndChapter(
            @PathVariable Long courseId,
            @PathVariable Long chapterId,
            @RequestParam(required = false) Lesson.SkillType skillType,
            @RequestParam(required = false) Course.Status status
    ) {
        if (chapterRepository.findByIdAndCourseId(chapterId, courseId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return getLessonsByChapter(chapterId, skillType, status);
    }

    @GetMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> getLessonById(@PathVariable Long id) {
        return lessonRepository.findById(id)
                .map(lesson -> ResponseEntity.ok(mapToResponse(lesson)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping(value = {"/chapters/{chapterId}/lessons", "/courses/{courseId}/chapters/{chapterId}/lessons"})
    public ResponseEntity<?> createLesson(
            @PathVariable(required = false) Long courseId,
            @PathVariable Long chapterId,
            @Valid @RequestBody LessonRequest request
    ) {
        Chapter chapter;
        if (courseId != null) {
            chapter = chapterRepository.findByIdAndCourseId(chapterId, courseId).orElse(null);
        } else {
            chapter = chapterRepository.findById(chapterId).orElse(null);
        }

        if (chapter == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Chapter not found with id: " + chapterId);
        }

        Lesson.SkillType skillType = request.skillType() != null ? request.skillType() : Lesson.SkillType.GRAMMAR;
        if (lessonRepository.existsByChapterIdAndSkillTypeAndDisplayOrder(chapterId, skillType, request.displayOrder())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Thứ tự hiển thị " + request.displayOrder() + " đã được sử dụng trong phần này.");
        }

        String documents = request.documents();
        if (documents != null && documents.trim().isEmpty()) {
            documents = null;
        }

        Lesson lesson = Lesson.builder()
                .chapter(chapter)
                .skillType(skillType)
                .lessonNo(request.lessonNo())
                .title(request.title())
                .description(request.description())
                .documents(documents)
                .displayOrder(request.displayOrder())
                .status(request.status() != null ? request.status() : Course.Status.DRAFT)
                .build();

        Lesson saved = lessonRepository.save(lesson);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/lessons/{id}")
    public ResponseEntity<?> updateLesson(
            @PathVariable Long id,
            @Valid @RequestBody LessonRequest request
    ) {
        Lesson lesson = lessonRepository.findById(id).orElse(null);
        if (lesson == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Lesson not found with id: " + id);
        }

        Lesson.SkillType skillType = request.skillType() != null ? request.skillType() : lesson.getSkillType();
        if (lessonRepository.existsByChapterIdAndSkillTypeAndDisplayOrderAndIdNot(
                lesson.getChapter().getId(), skillType, request.displayOrder(), id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Thứ tự hiển thị " + request.displayOrder() + " đã được sử dụng trong phần này.");
        }

        if (request.skillType() != null) {
            lesson.setSkillType(skillType);
        }
        lesson.setLessonNo(request.lessonNo());
        lesson.setTitle(request.title());
        lesson.setDescription(request.description());
        String updateDocs = request.documents();
        if (updateDocs != null && updateDocs.trim().isEmpty()) {
            updateDocs = null;
        }
        lesson.setDocuments(updateDocs);
        if (request.displayOrder() != null) {
            lesson.setDisplayOrder(request.displayOrder());
        }
        if (request.status() != null) {
            lesson.setStatus(request.status());
        }

        Lesson updated = lessonRepository.save(lesson);
        return ResponseEntity.ok(mapToResponse(updated));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/lessons/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        if (!lessonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        lessonRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private LessonResponse mapToResponse(Lesson lesson) {
        return new LessonResponse(
                lesson.getId(),
                lesson.getChapter() != null ? lesson.getChapter().getId() : null,
                lesson.getSkillType(),
                lesson.getLessonNo(),
                lesson.getTitle(),
                lesson.getDescription(),
                lesson.getDocuments(),
                lesson.getDisplayOrder(),
                lesson.getStatus(),
                lesson.getCreatedAt(),
                lesson.getUpdatedAt()
        );
    }
}
