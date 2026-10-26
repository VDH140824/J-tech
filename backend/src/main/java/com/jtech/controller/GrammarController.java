package com.jtech.controller;

import com.jtech.dto.request.GrammarCreateRequest;
import com.jtech.dto.response.CloudinaryUploadResponse;
import com.jtech.dto.response.GrammarDetailResponse;
import com.jtech.entity.Grammar;
import com.jtech.service.CloudinaryService;
import com.jtech.service.GrammarService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
public class GrammarController {
    private final GrammarService grammarService;
    private final CloudinaryService cloudinaryService;

    public GrammarController(GrammarService grammarService, CloudinaryService cloudinaryService) {
        this.grammarService = grammarService;
        this.cloudinaryService = cloudinaryService;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @GetMapping("/grammars/{id}")
    public ResponseEntity<GrammarDetailResponse> getGrammarById(@PathVariable Long id) {
        return ResponseEntity.ok(grammarService.getById(id));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @GetMapping("/lessons/{lessonId}/grammars")
    public ResponseEntity<List<GrammarDetailResponse>> getGrammarsByLesson(
            @PathVariable Long lessonId,
            @RequestParam(required = false) Grammar.Status status
    ) {
        return ResponseEntity.ok(grammarService.getByLesson(lessonId, status));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping("/lessons/{lessonId}/grammars")
    public ResponseEntity<GrammarDetailResponse> createGrammar(
            @PathVariable Long lessonId,
            @Valid @RequestBody GrammarCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(grammarService.create(lessonId, request));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping(value = "/grammars/videos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CloudinaryUploadResponse> uploadGrammarVideo(@RequestPart("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(cloudinaryService.uploadGrammarVideo(file));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Video upload failed", exception);
        }
    }
}
