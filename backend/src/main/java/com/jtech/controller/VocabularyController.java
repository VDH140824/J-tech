package com.jtech.controller;
import com.jtech.entity.*;
import com.jtech.dto.request.VocabularyRequest;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
public class VocabularyController {
    private final VocabularyRepository repository;
    private final VocabularyService service;
    public VocabularyController(VocabularyRepository repository, VocabularyService service) {
        this.repository = repository; this.service = service;
    }
    @GetMapping("/lessons/{parentId}/vocabularies")
    public List<Vocabulary> list(@PathVariable Long parentId, @RequestParam(required = false) Course.Status status, Authentication authentication) {
        service.checkLesson(parentId, authentication);
        return service.visible(repository.findByLessonIdOrderByDisplayOrderAscIdAsc(parentId), status, authentication);
    }
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping("/lessons/{parentId}/vocabularies")
    public ResponseEntity<Vocabulary> create(@PathVariable Long parentId, @Valid @RequestBody VocabularyRequest request, Authentication authentication) {
        service.checkLesson(parentId, authentication);
        if (repository.existsByLessonIdAndWordIgnoreCase(parentId, request.word().trim())) {
            throw new IllegalStateException("Từ vựng này đã tồn tại trong bài học. Vui lòng kiểm tra cả nội dung đã lưu trữ.");
        }
        Vocabulary item = new Vocabulary(); item.setLessonId(parentId);
        apply(item, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(item));
    }
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/vocabularies/{id}")
    public Vocabulary update(@PathVariable Long id, @Valid @RequestBody VocabularyRequest request) {
        Vocabulary item = service.require(repository, id);
        if (repository.existsByLessonIdAndWordIgnoreCaseAndIdNot(item.getLessonId(), request.word().trim(), id)) {
            throw new IllegalStateException("Từ vựng này đã tồn tại trong bài học.");
        }
        apply(item, request); return repository.save(item);
    }
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/vocabularies/{id}")
    public ResponseEntity<Void> archive(@PathVariable Long id) {
        Vocabulary item = service.require(repository, id); item.setStatus(Course.Status.ARCHIVED); repository.save(item);
        return ResponseEntity.noContent().build();
    }
    private void apply(Vocabulary item, VocabularyRequest request) {
        item.setWord(request.word() == null ? null : request.word().trim());
        item.setReading(request.reading() == null ? null : request.reading().trim());
        item.setMeaningVi(request.meaningVi() == null ? null : request.meaningVi().trim());
        item.setWordType(request.wordType() == null ? null : request.wordType().trim());
        item.setExampleJp(request.exampleJp() == null ? null : request.exampleJp().trim());
        item.setExampleVi(request.exampleVi() == null ? null : request.exampleVi().trim());
        item.setAudioUrl(request.audioUrl() == null ? null : request.audioUrl().trim());
        item.setAudioPublicId(request.audioPublicId() == null ? null : request.audioPublicId().trim());
        item.setDisplayOrder(request.displayOrder()); item.setStatus(request.status());
    }
}
