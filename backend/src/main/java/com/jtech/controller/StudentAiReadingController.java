package com.jtech.controller;

import com.jtech.dto.request.AiReadingRequests;
import com.jtech.dto.response.AiReadingResponses;
import com.jtech.service.AiReadingService;
import com.jtech.service.FeedbackService;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Trang "Đọc hiểu AI" của học viên. */
@RestController
@RequestMapping("/student/ai-reading")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentAiReadingController {
    private final AiReadingService service;
    private final FeedbackService access;

    public StudentAiReadingController(AiReadingService service, FeedbackService access) {
        this.service = service;
        this.access = access;
    }

    /** Tạo bài đọc mới (hoặc trả lại bài chưa nộp của cùng lesson). */
    @PostMapping
    public AiReadingResponses.Detail create(@RequestBody(required = false) AiReadingRequests.Create request,
            Principal principal) {
        return service.create(request, studentId(principal));
    }

    @GetMapping
    public AiReadingResponses.Page history(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size, Principal principal) {
        return service.history(studentId(principal), page, size);
    }

    @GetMapping("/{id}")
    public AiReadingResponses.Detail get(@PathVariable Long id, Principal principal) {
        return service.get(id, studentId(principal));
    }

    @PostMapping("/{id}/submit")
    public AiReadingResponses.Result submit(@PathVariable Long id, @RequestBody AiReadingRequests.Submit request,
            Principal principal) {
        return service.submit(id, studentId(principal), request);
    }

    private long studentId(Principal principal) {
        return access.actor(principal, "STUDENT").getUserId();
    }
}
