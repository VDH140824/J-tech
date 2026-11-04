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

    /*private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;
    private final com.jtech.service.KanjiService kanjiService;

    public LessonController(LessonRepository lessonRepository, ChapterRepository chapterRepository,
                            com.jtech.service.KanjiService kanjiService) {
        this.lessonRepository = lessonRepository;
        this.chapterRepository = chapterRepository;
        this.kanjiService = kanjiService;*/
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

    /*@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping(value = {"/chapters/{chapterId}/lessons", "/courses/{courseId}/chapters/{chapterId}/lessons"}, consumes = "application/json")
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

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping(value = "/lessons/{id}", consumes = "application/json")
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
        */
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
    /*
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @org.springframework.transaction.annotation.Transactional
    @PostMapping(value = "/chapters/{chapterId}/lessons", consumes = "multipart/form-data")
    public ResponseEntity<?> createKanjiLesson(@PathVariable Long chapterId,
            @Valid @RequestPart("request") LessonRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        requireKanji(request);
        var normalized = withDocuments(request, kanjiService.documents(request.documents(), null));
        return attach(createLesson(null, chapterId, normalized), file);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @org.springframework.transaction.annotation.Transactional
    @PutMapping(value = "/lessons/{id}", consumes = "multipart/form-data")
    public ResponseEntity<?> updateKanjiLesson(@PathVariable Long id,
            @Valid @RequestPart("request") LessonRequest request,
            @RequestPart(value = "file", required = false) org.springframework.web.multipart.MultipartFile file) {
        requireKanji(request);
        var lesson = lessonRepository.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học."));
        if (lesson.getSkillType() != Lesson.SkillType.KANJI) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài học không thuộc phần chữ Hán.");
        var normalized = withDocuments(request, kanjiService.documents(request.documents(), null));
        return attach(updateLesson(id, normalized), file);
    }

    private void requireKanji(LessonRequest request) {
        if (request.skillType() != Lesson.SkillType.KANJI) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ tài liệu cho bài học chữ Hán.");
    }
    private LessonRequest withDocuments(LessonRequest r, String docs) {
        return new LessonRequest(r.skillType(), r.lessonNo(), r.title(), r.description(), docs, r.displayOrder(), r.status());
    }
    private ResponseEntity<?> attach(ResponseEntity<?> response, org.springframework.web.multipart.MultipartFile file) {
        if (!response.getStatusCode().is2xxSuccessful() || file == null) return response;
        LessonResponse body = (LessonResponse) response.getBody();
        Lesson lesson = lessonRepository.findById(body.id()).orElseThrow();
        lesson.setDocuments(kanjiService.documents(lesson.getDocuments(), file));
        lessonRepository.saveAndFlush(lesson);
        return ResponseEntity.status(response.getStatusCode()).body(mapToResponse(lesson));
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
         */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<String> handleLessonError(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(exception.getReason());
    }
}
