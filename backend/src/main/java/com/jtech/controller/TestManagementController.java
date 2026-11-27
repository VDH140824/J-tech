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

@RestController
@RequestMapping("/moderator/tests")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
public class TestManagementController {

    private final TestManagementService service;

    public TestManagementController(TestManagementService service) {
        this.service = service;
    }

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

    @GetMapping("/{id}")
    public ResponseEntity<TestManagementResponse.Detail> detail(@PathVariable Long id) {
        return ResponseEntity.ok(service.detail(id));
    }

    @PostMapping
    public ResponseEntity<TestManagementResponse.Detail> create(@Valid @RequestBody TestManagementRequest request,
            Principal principal) {
        TestManagementResponse.Detail created = service.create(request, principal.getName());
        return ResponseEntity.created(URI.create("/api/moderator/tests/" + created.summary().id())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TestManagementResponse.Detail> update(@PathVariable Long id,
            @Valid @RequestBody TestManagementRequest request, Principal principal) {
        return ResponseEntity.ok(service.update(id, request, principal.getName()));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<TestManagementResponse.Detail> publish(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.publish(id, principal.getName()));
    }

    @PutMapping("/{id}/unpublish")
    public ResponseEntity<TestManagementResponse.Detail> unpublish(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.unpublish(id, principal.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<TestManagementResponse.DeleteResult> delete(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.delete(id, principal.getName()));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
