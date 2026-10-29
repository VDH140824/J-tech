package com.jtech.controller;

import com.jtech.dto.request.FeedbackRequest;
import com.jtech.dto.request.FeedbackResolutionRequest;
import com.jtech.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.*;

@RestController
public class FeedbackController {
    private final FeedbackService service;
    private final JdbcTemplate db;
    public FeedbackController(FeedbackService service, JdbcTemplate db) { this.service = service; this.db = db; }

    @PostMapping(value = "/feedback", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> submit(Principal principal, @Valid @RequestPart("feedback") FeedbackRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return service.submit(principal, request, image);
    }

    @GetMapping("/feedback")
    public Map<String, Object> mine(Principal principal, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size, @RequestParam(required = false) String status) {
        return service.list(service.actor(principal, "STUDENT").getUserId(), null, status, null, null, null, page, size);
    }

    @GetMapping("/feedback/{id}")
    public Map<String, Object> detail(Principal principal, @PathVariable long id) {
        return service.detail(id, service.actor(principal, "STUDENT").getUserId(), null);
    }

    @GetMapping("/feedback/references")
    public List<Map<String, Object>> references(Principal principal) {
        service.actor(principal, "STUDENT");
        return service.references();
    }

    @GetMapping("/feedback/references/{lessonId}/questions")
    public List<Map<String, Object>> questions(Principal principal, @PathVariable long lessonId) {
        service.actor(principal, "STUDENT");
        return db.queryForList("""
            SELECT q.id,q.content FROM question q JOIN lesson l ON l.id=q.lesson_id
            JOIN chapter ch ON ch.id=l.chapter_id JOIN course c ON c.id=ch.course_id
            WHERE q.lesson_id=? AND q.status='ACTIVE' AND l.status='PUBLISHED'
            AND ch.status='PUBLISHED' AND c.status='PUBLISHED' ORDER BY q.display_order,q.id
            """, lessonId);
    }

    @GetMapping("/{portal:admin|moderator}/feedback")
    public Map<String, Object> queue(Principal principal, @PathVariable String portal,
            @RequestParam(required = false) String status, @RequestParam(required = false) String search,
            @RequestParam(required = false) Long courseId, @RequestParam(required = false) Long lessonId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        service.actor(principal, role(portal));
        return service.list(null, type(portal), status, search, courseId, lessonId, page, size);
    }

    @GetMapping("/moderator/feedback/references")
    public List<Map<String, Object>> moderatorReferences(Principal principal) {
        service.actor(principal, "MODERATOR");
        return db.queryForList("""
            SELECT l.id,l.title,ch.title AS chapterTitle,c.name AS courseName,c.id AS courseId
            FROM lesson l JOIN chapter ch ON ch.id=l.chapter_id JOIN course c ON c.id=ch.course_id
            ORDER BY c.display_order,ch.display_order,l.display_order,l.id
            """);
    }

    @GetMapping("/{portal:admin|moderator}/feedback/{id}")
    public Map<String, Object> review(Principal principal, @PathVariable String portal, @PathVariable long id) {
        service.actor(principal, role(portal));
        return service.detail(id, null, type(portal));
    }

    @PatchMapping("/{portal:admin|moderator}/feedback/{id}")
    public Map<String, Object> resolve(Principal principal, @PathVariable String portal, @PathVariable long id,
            @Valid @RequestBody FeedbackResolutionRequest request) {
        return service.resolve(id, type(portal), service.actor(principal, role(portal)), request);
    }

    @GetMapping("/feedback/notifications")
    public List<Map<String, Object>> notifications(Principal principal) {
        long userId = service.actor(principal, "STUDENT").getUserId();
        return db.queryForList("SELECT id,title,content,link_url AS linkUrl,is_read AS isRead,created_at AS createdAt FROM notification WHERE user_id=? AND type='FEEDBACK' ORDER BY created_at DESC,id DESC LIMIT 30", userId);
    }

    @PatchMapping("/feedback/notifications/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readNotification(Principal principal, @PathVariable long id) {
        long userId = service.actor(principal, "STUDENT").getUserId();
        if (db.update("UPDATE notification SET is_read=TRUE,read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=? AND type='FEEDBACK'", id, userId) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông báo.");
    }

    private String role(String portal) { return "admin".equals(portal) ? "ADMIN" : "MODERATOR"; }
    private String type(String portal) { return "admin".equals(portal) ? "TECHNICAL" : "CONTENT"; }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.multipart.support.MissingServletRequestPartException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalidRequest(Exception ignored) {
        return Map.of("message", "Dữ liệu phản hồi không hợp lệ. Vui lòng kiểm tra loại, trạng thái và tham chiếu nội dung.");
    }
}
