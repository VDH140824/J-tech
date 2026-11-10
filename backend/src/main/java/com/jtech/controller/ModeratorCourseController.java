package com.jtech.controller;

import com.jtech.dto.response.*;
import com.jtech.entity.Course;
import com.jtech.repository.CourseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Locale;
import com.jtech.dto.request.CourseRequest;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/moderator/courses")
@PreAuthorize("hasAnyAuthority('MODERATOR', 'ROLE_MODERATOR')")
public class ModeratorCourseController {
    private final CourseRepository repository;

    public ModeratorCourseController(CourseRepository repository) {
        this.repository = repository;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<java.util.Map<String, String>> handleStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(java.util.Map.of("message", exception.getReason() == null ? "Yêu cầu không hợp lệ." : exception.getReason()));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<java.util.Map<String, String>> handleConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(java.util.Map.of("message", "Mã khóa học đã tồn tại hoặc khóa học đang có dữ liệu liên quan."));
    }

    @GetMapping
    // The list and all mutation endpoints share the Moderator authorization above.
    public Page<ModeratorCourseSummary> getCourses(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) Course.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > 100 || search.length() > 150) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid course list parameters");
        }
        String query = search.trim().toLowerCase(Locale.ROOT)
                .replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return repository.findForModerator("%" + query + "%", status, PageRequest.of(page, size));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Long> createCourse(@Valid @RequestBody CourseRequest request) {
        if (repository.existsByCodeIgnoreCase(request.code().trim())) throw new IllegalStateException("Mã khóa học đã tồn tại.");
        Course course = new Course();
        applyRequest(course, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.saveAndFlush(course).getId());
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> updateCourse(@PathVariable Long id, @Valid @RequestBody CourseRequest request) {
        Course course = repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học."));
        if (repository.existsByCodeIgnoreCaseAndIdNot(request.code().trim(), id)) throw new IllegalStateException("Mã khóa học đã tồn tại.");
        applyRequest(course, request);
        repository.saveAndFlush(course);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteCourse(@PathVariable Long id) {
        Course course = repository.findOneById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học."));
        if (course.getChapters().isEmpty()) {
            repository.delete(course);
        } else {
            course.setDeletedAt(java.time.LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")));
            course.setStatus(Course.Status.HIDDEN);
            repository.save(course);
        }
        repository.flush();
        return ResponseEntity.noContent().build();
    }

    private void applyRequest(Course course, CourseRequest request) {
        String thumbnail = request.thumbnailUrl() == null ? "" : request.thumbnailUrl().trim();
        if (!thumbnail.isEmpty() && !thumbnail.matches("(?i)^https?://[^\\s]+$")) throw new IllegalArgumentException("Ảnh khóa học phải là đường dẫn HTTP hoặc HTTPS.");
        course.setCode(request.code().trim());
        course.setName(request.name().trim());
        course.setDescription(request.description() == null ? null : request.description().trim());
        course.setThumbnailUrl(thumbnail.isEmpty() ? null : thumbnail);
        course.setDisplayOrder(request.displayOrder());
        course.setStatus(request.status());
    }

    @GetMapping("/{id}/edit")
    public ResponseEntity<ModeratorCourseDetail> getCourseForEdit(@PathVariable Long id) {
        return repository.findById(id).map(c -> ResponseEntity.ok(new ModeratorCourseDetail(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getThumbnailUrl(), c.getDisplayOrder(), c.getStatus())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDetail> getCourse(@PathVariable Long id) {
        return repository.findOneById(id)
                .map(c -> ResponseEntity.ok(new CourseDetail(c.getId(), c.getCode(), c.getName(),
                        c.getDescription(), c.getThumbnailUrl(), c.getChapters().stream()
                        .map(ch -> new ChapterSummary(ch.getId(), ch.getChapterNo(), ch.getTitle(), ch.getDescription()))
                        .toList())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
