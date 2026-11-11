package com.jtech.controller;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.*;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
public class VocabularyController {

    private final VocabularyRepository repository;
    private final VocabularyService service;

    public VocabularyController(VocabularyRepository repository, VocabularyService service) {
        this.repository = repository;
        this.service = service;
    }

    @GetMapping("/lessons/{parentId}/vocabularies")
    public List<Vocabulary> list(
        @PathVariable Long parentId,
        @RequestParam(required = false) Course.Status status,
        Authentication authentication
    ) {
        service.checkLesson(parentId, authentication);
        return service.visible(
            repository.findByLessonIdOrderByDisplayOrderAscIdAsc(parentId),
            status,
            authentication
        );
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping("/lessons/{parentId}/vocabularies")
    public ResponseEntity<Vocabulary> create(
        @PathVariable Long parentId,
        @Valid @RequestBody VocabularyRequest request,
        Authentication authentication
    ) {
        Vocabulary item = service.create(repository, parentId, request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(item);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/vocabularies/{id}")
    public Vocabulary update(@PathVariable Long id, @Valid @RequestBody VocabularyRequest request) {
        return service.update(repository, id, request);
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PatchMapping("/lessons/{lessonId}/vocabularies/status")
    public BulkStatusResult updateStatuses(
        @PathVariable Long lessonId,
        @Valid @RequestBody BulkStatusRequest request,
        Authentication authentication
    ) {
        return new BulkStatusResult(
            service.updateStatuses(repository, lessonId, request.ids(), request.status(), authentication)
        );
    }

    public record BulkStatusRequest(@NotEmpty List<@NotNull @Positive Long> ids, @NotNull Course.Status status) {}

    public record BulkStatusResult(int updatedCount) {}

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/vocabularies/{id}")
    public ResponseEntity<Void> archive(@PathVariable Long id) {
        Vocabulary item = service.require(repository, id);
        item.setStatus(Course.Status.ARCHIVED);
        repository.save(item);
        return ResponseEntity.noContent().build();
    }
}
