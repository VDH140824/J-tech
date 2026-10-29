package com.jtech.controller;

import com.jtech.dto.request.VocabularyMiniTestGenerateRequest;
import com.jtech.dto.response.VocabularyMiniTestResponse;
import com.jtech.service.VocabularyMiniTestService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/moderator/vocabulary")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
public class VocabularyMiniTestController {
    private final VocabularyMiniTestService service;
    public VocabularyMiniTestController(VocabularyMiniTestService service) { this.service = service; }
    @GetMapping("/lessons/{lessonId}/mini-tests")
    public List<VocabularyMiniTestResponse> list(@PathVariable Long lessonId, Authentication authentication) { return service.list(lessonId, authentication); }
    @GetMapping("/mini-tests/{id}")
    public VocabularyMiniTestResponse detail(@PathVariable Long id) { return service.get(id); }
    @PostMapping("/lessons/{lessonId}/mini-tests")
    public ResponseEntity<VocabularyMiniTestResponse> create(@PathVariable Long lessonId, @Valid @RequestBody VocabularyMiniTestGenerateRequest request, Authentication authentication) {
        return ResponseEntity.ok(service.generate(lessonId, request, authentication));
    }
    @DeleteMapping("/mini-tests/{id}")
    public ResponseEntity<Void> archive(@PathVariable Long id) { service.archive(id); return ResponseEntity.noContent().build(); }
    @PostMapping("/mini-tests/{id}/preview")
    public VocabularyMiniTestResponse.Result preview(@PathVariable Long id, @RequestBody Map<String, String> answers) { return service.preview(id, answers); }
}
