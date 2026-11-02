package com.jtech.controller;

import com.jtech.dto.request.*;
import com.jtech.dto.response.*;
import com.jtech.repository.UserRepository;
import com.jtech.service.KanjiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;

@RestController @RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
public class KanjiController {
    private final KanjiService kanjiService;
    private final UserRepository userRepository;
    @PostMapping(value = "/lessons/{lessonId}/kanji", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<KanjiDetailResponse> createKanji(Principal principal, @PathVariable Long lessonId,
            @Valid @RequestPart("request") KanjiCreateRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ResponseEntity.status(HttpStatus.CREATED).body(kanjiService.create(actor(principal), lessonId, request, image));
    }
    @GetMapping("/lessons/{lessonId}/kanji")
    public Page<KanjiDetailResponse> listByLesson(@PathVariable Long lessonId, @RequestParam(required = false) String search,
            @RequestParam(required = false) com.jtech.entity.Kanji.Status status, Pageable page) {
        return kanjiService.listByLesson(lessonId, search, status, page);
    }
    @GetMapping("/kanji/{id}")
    public KanjiDetailResponse getKanji(@PathVariable Long id) { return kanjiService.getDetail(id); }
    @PutMapping(value = "/kanji/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public KanjiDetailResponse updateKanji(Principal principal, @PathVariable Long id,
            @Valid @RequestPart("request") KanjiUpdateRequest request,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return kanjiService.update(actor(principal), id, request, image);
    }
    @DeleteMapping("/kanji/{id}")
    public ResponseEntity<java.util.Map<String, String>> deleteKanji(Principal principal, @PathVariable Long id) {
        var result = kanjiService.deleteOrArchive(actor(principal), id);
        return result ? ResponseEntity.noContent().build() : ResponseEntity.ok(java.util.Map.of("result", "ARCHIVED"));
    }
    private Long actor(Principal principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return userRepository.findByEmail(principal.getName()).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED)).getUserId();
    }
}
