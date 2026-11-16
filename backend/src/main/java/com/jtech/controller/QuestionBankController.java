package com.jtech.controller;

import com.jtech.dto.request.QuestionBankRequest;
import com.jtech.dto.response.QuestionBankResponse;
import com.jtech.entity.Question;
import com.jtech.repository.QuestionBankQueryRepository;
import com.jtech.service.QuestionBankService;
import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** UC-39 Manage Question Bank: /api/moderator/question-bank */
@RestController
@RequestMapping("/moderator/question-bank")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
public class QuestionBankController {

    private final QuestionBankService service;

    public QuestionBankController(QuestionBankService service) {
        this.service = service;
    }

    /** Bước 2 + A1: danh sách câu hỏi theo bộ lọc. */
    @GetMapping
    public ResponseEntity<QuestionBankResponse.Page> search(
            @RequestParam(required = false) Question.Skill skill,
            @RequestParam(required = false) Question.QuestionType questionType,
            @RequestParam(required = false) Question.QuestionStatus status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long chapterId,
            @RequestParam(required = false) Long lessonId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long testId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var filter = new QuestionBankQueryRepository.Filter(skill, questionType, status, courseId, chapterId, lessonId, keyword, testId);
        return ResponseEntity.ok(service.search(filter, page, size));
    }

    /** Khóa học, chương, bài học, điểm ngữ pháp, bài nghe, thể chia cho bộ lọc và biểu mẫu. */
    @GetMapping("/targets")
    public ResponseEntity<QuestionBankResponse.Targets> targets() {
        return ResponseEntity.ok(service.targets());
    }

    /** Đề có thể gắn câu hỏi của bài học: mini test của bài học và test chương tổng hợp của chương. */
    @GetMapping("/tests")
    public ResponseEntity<List<QuestionBankResponse.TestItem>> tests(@RequestParam Long lessonId,
            @RequestParam Question.Skill skill) {
        return ResponseEntity.ok(service.availableTests(lessonId, skill));
    }

    /** A2: xem chi tiết. */
    @GetMapping("/{id}")
    public ResponseEntity<QuestionBankResponse.Detail> detail(@PathVariable Long id) {
        return ResponseEntity.ok(service.detail(id));
    }

    /** Bước 7–11: tạo câu hỏi. */
    @PostMapping
    public ResponseEntity<QuestionBankResponse.Detail> create(@Valid @RequestBody QuestionBankRequest request,
            Principal principal) {
        QuestionBankResponse.Detail created = service.create(request, principal.getName());
        return ResponseEntity.created(URI.create("/api/moderator/question-bank/" + created.summary().id())).body(created);
    }

    /** A3 / A4: sửa câu hỏi (BR-29). */
    @PutMapping("/{id}")
    public ResponseEntity<QuestionBankResponse.Detail> update(@PathVariable Long id,
            @Valid @RequestBody QuestionBankRequest request, Principal principal) {
        return ResponseEntity.ok(service.update(id, request, principal.getName()));
    }

    /** A5: xóa vĩnh viễn khi BR-13 cho phép (409 nếu phải lưu trữ). */
    @DeleteMapping("/{id}")
    public ResponseEntity<QuestionBankResponse.DeleteResult> delete(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.delete(id, principal.getName()));
    }

    /** A6: lưu trữ. */
    @PutMapping("/{id}/archive")
    public ResponseEntity<QuestionBankResponse.DeleteResult> archive(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.archive(id, principal.getName()));
    }
}
