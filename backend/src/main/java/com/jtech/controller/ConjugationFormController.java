package com.jtech.controller;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.response.ConjugationFormResponse;
import com.jtech.dto.response.DeleteResultResponse;
import com.jtech.entity.Course;
import com.jtech.service.ConjugationFormService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
}
