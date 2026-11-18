package com.jtech.controller;

import com.jtech.dto.request.TestManagementRequest;
import com.jtech.dto.response.TestManagementResponse;
import com.jtech.repository.TestManagementQueryRepository;
import com.jtech.service.TestManagementService;
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

/** Quản lý bài kiểm tra (Moderator): /api/moderator/tests — mini test và test chương. */
@RestController
@RequestMapping("/moderator/tests")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
public class TestManagementController {

    private final TestManagementService service;

    public TestManagementController(TestManagementService service) {
        this.service = service;
    }

    /** Bước 2: danh sách đề theo bộ lọc. */
    @GetMapping
    public ResponseEntity<TestManagementResponse.Page> search(
            @RequestParam(required = false) String testType,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long chapterId,
            @RequestParam(required = false) Long lessonId,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var filter = new TestManagementQueryRepository.Filter(blankToNull(testType), blankToNull(skill),
                blankToNull(status), courseId, chapterId, lessonId, keyword);
        return ResponseEntity.ok(service.search(filter, page, size));
    }

    /** Bước 8: câu hỏi ngân hàng để chọn (theo đề đang sửa, hoặc theo loại đề + bài học / chương khi tạo mới). */
    @GetMapping("/candidates")
    public ResponseEntity<List<TestManagementResponse.QuestionItem>> candidates(
            @RequestParam(required = false) Long testId,
            @RequestParam(required = false) TestManagementRequest.TestType testType,
            @RequestParam(required = false) String testSkill,
            @RequestParam(required = false) Long lessonId,
            @RequestParam(required = false) Long chapterId,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String questionType,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(service.candidates(testId, testType, testSkill, lessonId, chapterId, skill, questionType,
                difficulty, keyword));
    }

    /** A1: chi tiết đề. */
    @GetMapping("/{id}")
    public ResponseEntity<TestManagementResponse.Detail> detail(@PathVariable Long id) {
        return ResponseEntity.ok(service.detail(id));
    }

    /** Bước 10–11: tạo đề (nháp). */
    @PostMapping
    public ResponseEntity<TestManagementResponse.Detail> create(@Valid @RequestBody TestManagementRequest request,
            Principal principal) {
        TestManagementResponse.Detail created = service.create(request, principal.getName());
        return ResponseEntity.created(URI.create("/api/moderator/tests/" + created.summary().id())).body(created);
    }

    /** A2: sửa đề. */
    @PutMapping("/{id}")
    public ResponseEntity<TestManagementResponse.Detail> update(@PathVariable Long id,
            @Valid @RequestBody TestManagementRequest request, Principal principal) {
        return ResponseEntity.ok(service.update(id, request, principal.getName()));
    }

    /** A3: xuất bản. */
    @PutMapping("/{id}/publish")
    public ResponseEntity<TestManagementResponse.Detail> publish(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.publish(id, principal.getName()));
    }

    /** A4: chuyển về nháp. */
    @PutMapping("/{id}/unpublish")
    public ResponseEntity<TestManagementResponse.Detail> unpublish(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.unpublish(id, principal.getName()));
    }

    /** A5: xóa; đề đã có lượt làm thì chuyển Lưu trữ (BR-T7). */
    @DeleteMapping("/{id}")
    public ResponseEntity<TestManagementResponse.DeleteResult> delete(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.delete(id, principal.getName()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
