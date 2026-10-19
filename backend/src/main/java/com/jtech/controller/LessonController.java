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

    @GetMapping("/lessons/{id}")
    public ResponseEntity<LessonResponse> getLessonById(@PathVariable Long id) {
        return lessonRepository.findById(id)
                .map(lesson -> ResponseEntity.ok(mapToResponse(lesson)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/chapters/{chapterId}/lessons")
    public ResponseEntity<?> createLesson(
            @PathVariable Long chapterId,
            @Valid @RequestBody LessonRequest request
    ) {
        Chapter chapter = chapterRepository.findById(chapterId).orElse(null);
        if (chapter == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Chapter not found with id: " + chapterId);
        }

        Lesson lesson = Lesson.builder()
                .chapter(chapter)
                .skillType(request.skillType() != null ? request.skillType() : Lesson.SkillType.GRAMMAR)
                .lessonNo(request.lessonNo())
                .title(request.title())
                .description(request.description())
                .documents(request.documents())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : request.lessonNo())
                .status(request.status() != null ? request.status() : Course.Status.DRAFT)
                .build();

        Lesson saved = lessonRepository.save(lesson);
        return ResponseEntity.status(HttpStatus.CREATED).body(mapToResponse(saved));
    }

    @PutMapping("/lessons/{id}")
    public ResponseEntity<?> updateLesson(
            @PathVariable Long id,
            @Valid @RequestBody LessonRequest request
    ) {
        Lesson lesson = lessonRepository.findById(id).orElse(null);
        if (lesson == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Lesson not found with id: " + id);
        }

        if (request.skillType() != null) {
            lesson.setSkillType(request.skillType());
        }
        lesson.setLessonNo(request.lessonNo());
        lesson.setTitle(request.title());
        lesson.setDescription(request.description());
        lesson.setDocuments(request.documents());
        if (request.displayOrder() != null) {
            lesson.setDisplayOrder(request.displayOrder());
        }
        if (request.status() != null) {
            lesson.setStatus(request.status());
        }

        Lesson updated = lessonRepository.save(lesson);
        return ResponseEntity.ok(mapToResponse(updated));
    }

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
