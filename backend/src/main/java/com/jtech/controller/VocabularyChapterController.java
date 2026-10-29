package com.jtech.controller;
import com.jtech.service.VocabularyChapterService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/moderator/vocabulary/chapters")
@PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
public class VocabularyChapterController {
    private final VocabularyChapterService service;
    public VocabularyChapterController(VocabularyChapterService service) { this.service = service; }
    @GetMapping("/{chapterId}/flashcards")
    public List<VocabularyChapterService.Flashcard> flashcards(@PathVariable Long chapterId) { return service.flashcards(chapterId); }
}
