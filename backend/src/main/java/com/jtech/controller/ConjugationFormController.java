package com.jtech.controller;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.request.ConjugationQuestionRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.dto.response.PracticeQuestionResponse;
import com.jtech.entity.Course;
import com.jtech.entity.Question;
import com.jtech.service.ConjugationFormService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
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

import java.net.URI;
import java.security.Principal;
import java.util.List;


@RestController
@RequestMapping("/moderator/conjugation-forms")
public class ConjugationFormController {

    private final ConjugationFormService conjugationFormService;

    public ConjugationFormController(ConjugationFormService conjugationFormService) {
        this.conjugationFormService = conjugationFormService;
    }

    /** sd View Conjugation Forms, message 1.1: GET /api/moderator/conjugation-forms */
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @GetMapping
    public ResponseEntity<Page<ConjugationFormResponse>> getAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Course.Status status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {
        PageRequest pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.ASC, "displayOrder").and(Sort.by(Sort.Direction.ASC, "id")));
        return ResponseEntity.ok(conjugationFormService.getAll(keyword, status, pageable));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping
    public ResponseEntity<ConjugationFormResponse> create(
            @Valid @RequestBody ConjugationFormRequest request,
            Principal principal) {
        ConjugationFormResponse response = conjugationFormService.create(request, principal.getName());
        return ResponseEntity
                .created(URI.create("/api/moderator/conjugation-forms/" + response.id()))
                .body(response);
    }

    /** sd Update Conjugation Form, message 3.3: PUT /api/moderator/conjugation-forms/{id} */
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/{id}")
    public ResponseEntity<ConjugationFormResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody ConjugationFormRequest request,
            Principal principal) {
        return ResponseEntity.ok(conjugationFormService.update(id, request, principal.getName()));
    }

    /**
     * sd Delete / Archive Conjugation Form, message 3.1: DELETE /api/moderator/conjugation-forms/{id}
     * 200 OK kèm archived để Browser chọn thông báo ở 3.3: true = đã lưu trữ, false = đã xóa hẳn.
     */
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/{id}")
    public ResponseEntity<DeleteResultResponse> delete(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(conjugationFormService.delete(id, principal.getName()));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @GetMapping("/{id}/practice-questions")
    public ResponseEntity<List<PracticeQuestionResponse>> getPracticeQuestions(
            @PathVariable Long id,
            @RequestParam(required = false) Question.Difficulty difficulty,
            @RequestParam(required = false) Integer verbGroup) {
        return ResponseEntity.ok(conjugationFormService.getPracticeQuestions(id, difficulty, verbGroup));
    }

    /** UC-47 bước 5: thêm câu hỏi thủ công. */
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping("/{id}/questions")
    public ResponseEntity<PracticeQuestionResponse> createQuestion(
            @PathVariable Long id,
            @Valid @RequestBody ConjugationQuestionRequest request,
            Principal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(conjugationFormService.createQuestion(id, request, principal.getName()));
    }

    /** UC-47 bước 5: sửa câu hỏi. */
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/{id}/questions/{questionId}")
    public ResponseEntity<PracticeQuestionResponse> updateQuestion(
            @PathVariable Long id,
            @PathVariable Long questionId,
            @Valid @RequestBody ConjugationQuestionRequest request,
            Principal principal) {
        return ResponseEntity.ok(conjugationFormService.updateQuestion(id, questionId, request, principal.getName()));
    }

    /** UC-47 bước 5: xóa mềm câu hỏi. */
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/{id}/questions/{questionId}")
    public ResponseEntity<Void> deleteQuestion(
            @PathVariable Long id,
            @PathVariable Long questionId,
            Principal principal) {
        conjugationFormService.deleteQuestion(id, questionId, principal.getName());
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/{id}/practice-questions")
    public ResponseEntity<ConjugationFormResponse> updatePracticeQuestions(
            @PathVariable Long id,
            @RequestBody List<Long> questionIds,
            Principal principal) {
        return ResponseEntity.ok(conjugationFormService.updatePracticeQuestions(id, questionIds, principal.getName()));
    }
}
