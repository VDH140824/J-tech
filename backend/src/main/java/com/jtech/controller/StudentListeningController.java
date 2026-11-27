package com.jtech.controller;

import com.jtech.dto.request.ListeningSubmitRequest;
import com.jtech.dto.response.ListeningResponses;
import com.jtech.service.FeedbackService;
import com.jtech.service.ListeningService;
import java.security.Principal;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Trang "Nghe hiểu" của học viên. */
@RestController
@RequestMapping("/student/listening")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentListeningController {
    private final ListeningService service;
    private final FeedbackService access;

    public StudentListeningController(ListeningService service, FeedbackService access) {
        this.service = service;
        this.access = access;
    }

    /** Danh sách bài nghe đã xuất bản; courseId để lọc Nhật 1 / Nhật 2. */
    @GetMapping
    public List<ListeningResponses.LessonItem> list(@RequestParam(required = false) Long courseId, Principal principal) {
        return service.list(courseId, studentId(principal));
    }

    @GetMapping("/{lessonId}")
    public ListeningResponses.Detail detail(@PathVariable Long lessonId, Principal principal) {
        return service.detail(lessonId, studentId(principal));
    }

    @PostMapping("/{lessonId}/submit")
    public ListeningResponses.Result submit(@PathVariable Long lessonId, @RequestBody ListeningSubmitRequest request,
            Principal principal) {
        return service.submit(lessonId, studentId(principal), request);
    }

    private long studentId(Principal principal) {
        return access.actor(principal, "STUDENT").getUserId();
    }
}
