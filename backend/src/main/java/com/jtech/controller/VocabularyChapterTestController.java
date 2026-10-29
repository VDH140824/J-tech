package com.jtech.controller;

import com.jtech.dto.request.VocabularyChapterTestRequest;
import com.jtech.dto.response.VocabularyMiniTestResponse;
import com.jtech.service.VocabularyChapterTestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/moderator/vocabulary/chapters/{chapterId}/test")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
public class VocabularyChapterTestController {
    private final VocabularyChapterTestService service;
    public VocabularyChapterTestController(VocabularyChapterTestService service) { this.service = service; }
    @GetMapping public VocabularyChapterTestService.Setup setup(@PathVariable Long chapterId) { return service.setup(chapterId); }
    @PostMapping public VocabularyMiniTestResponse save(@PathVariable Long chapterId, @Valid @RequestBody VocabularyChapterTestRequest request) { return service.save(chapterId, request); }
    @DeleteMapping public ResponseEntity<Void> archive(@PathVariable Long chapterId) { service.archive(chapterId); return ResponseEntity.noContent().build(); }
    @PostMapping("/preview") public VocabularyMiniTestResponse.Result preview(@PathVariable Long chapterId, @RequestBody Map<String, String> answers) { return service.preview(chapterId, answers); }
}
