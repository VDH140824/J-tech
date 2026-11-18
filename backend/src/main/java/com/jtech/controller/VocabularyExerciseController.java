package com.jtech.controller;

import com.jtech.dto.request.VocabularyExerciseRequest;
import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.service.VocabularyExerciseService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/moderator/vocabulary")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
public class VocabularyExerciseController {

    private final VocabularyExerciseService service;

    public VocabularyExerciseController(VocabularyExerciseService service) {
        this.service = service;
    }

    @GetMapping("/lessons/{lessonId}/mini-tests")
    public List<VocabularyTestResponse> list(
        @PathVariable Long lessonId,
        Authentication authentication
    ) {
        return service.list(lessonId, authentication);
    }

    @GetMapping("/mini-tests/{id}")
    public VocabularyTestResponse detail(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping("/lessons/{lessonId}/mini-tests")
    public ResponseEntity<VocabularyTestResponse> create(
        @PathVariable Long lessonId,
        @Valid @RequestBody VocabularyExerciseRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(service.saveReviewed(lessonId, request, authentication));
    }

    @PostMapping(value = "/lessons/{lessonId}/mini-tests/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<VocabularyTestResponse> importQuestions(
        @PathVariable Long lessonId,
        @RequestPart("file") MultipartFile file,
        Authentication authentication
    ) {
        return ResponseEntity.ok(service.importQuestions(lessonId, file, authentication));
    }

    @DeleteMapping("/mini-tests/{id}")
    public ResponseEntity<Void> archive(@PathVariable Long id) {
        service.archive(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mini-tests/{id}/preview")
    public VocabularyTestResponse.Result preview(
        @PathVariable Long id,
        @RequestBody Map<String, String> answers
    ) {
        return service.preview(id, answers);
    }
}
