package com.jtech.controller;

import com.jtech.dto.response.StudentConjugationResponse;
import com.jtech.service.FeedbackService;
import com.jtech.service.StudentConjugationService;
import java.security.Principal;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Màn hình “Thể chia” của học viên (UC-21, UC-22, UC-23). */
@RestController
@RequestMapping("/conjugation-study/forms")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentConjugationController {
    private final StudentConjugationService service;
    private final FeedbackService access;

    public StudentConjugationController(StudentConjugationService service, FeedbackService access) {
        this.service = service;
        this.access = access;
    }

    /** Conjugation List: tìm theo từ khóa, lọc nhóm động từ (0 = Tất cả). */
    @GetMapping
    public List<StudentConjugationResponse.FormCard> list(
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "0") int group,
        @RequestParam(defaultValue = "ALL") String difficulty,
        Principal principal
    ) {
        return service.list(keyword, group, difficulty, studentId(principal));
    }

    /** “Xem cách chia” + danh sách đề của thể chia. */
    @GetMapping("/{formId}")
    public StudentConjugationResponse.FormDetail detail(
        @PathVariable Long formId,
        @RequestParam(defaultValue = "0") int group,
        @RequestParam(defaultValue = "ALL") String difficulty,
        Principal principal
    ) {
        return service.detail(formId, group, difficulty, studentId(principal));
    }

    /** Conjugation Practice: bắt đầu một lượt mới, lấy ngẫu nhiên N câu (mode = typed | choice). */
    @PostMapping("/{formId}/sessions")
    public StudentConjugationResponse.PracticeSession start(
        @PathVariable Long formId,
        @RequestParam(defaultValue = "0") int group,
        @RequestParam(defaultValue = "ALL") String difficulty,
        @RequestParam(defaultValue = "typed") String mode,
        Principal principal
    ) {
        studentId(principal);
        return service.start(formId, group, difficulty, mode);
    }

    @PostMapping("/{formId}/check")
    public StudentConjugationResponse.CheckResult check(
        @PathVariable Long formId,
        @RequestBody StudentConjugationResponse.CheckRequest request,
        Principal principal
    ) {
        studentId(principal);
        return service.check(formId, request);
    }

    @PostMapping("/{formId}/submit")
    public StudentConjugationResponse.Result submit(
        @PathVariable Long formId,
        @RequestBody StudentConjugationResponse.SubmitRequest request,
        Principal principal
    ) {
        return service.submit(formId, studentId(principal), request);
    }

    private long studentId(Principal principal) {
        return access.actor(principal, "STUDENT").getUserId();
    }
}
