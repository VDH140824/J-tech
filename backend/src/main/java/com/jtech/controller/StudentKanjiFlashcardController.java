package com.jtech.controller;

import com.jtech.service.StudentKanjiFlashcardService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.security.Principal;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentKanjiFlashcardController {

  private final StudentKanjiFlashcardService service;

  public StudentKanjiFlashcardController(StudentKanjiFlashcardService service) {
    this.service = service;
  }

  @GetMapping("/student/lessons/{lessonId}/kanji-flashcards")
  public List<StudentKanjiFlashcardService.Card> cards(
    @PathVariable long lessonId,
    Principal principal
  ) {
    return service.cards(lessonId, principal);
  }

  public record Progress(@NotNull Boolean remembered) {}

  @GetMapping("/student/chapters/{chapterId}/kanji-tests")
  public List<StudentKanjiFlashcardService.PublishedTest> tests(
    @PathVariable long chapterId,
    Principal principal
  ) {
    return service.chapterTests(chapterId, principal);
  }

  @PutMapping(
    "/student/chapters/{chapterId}/kanji-flashcards/{kanjiId}/progress"
  )
  public void progress(
    @PathVariable long chapterId,
    @PathVariable long kanjiId,
    @Valid @RequestBody Progress progress,
    Principal principal
  ) {
    service.chapterRemember(
      chapterId,
      kanjiId,
      progress.remembered(),
      principal
    );
  }

  @GetMapping("/student/chapters/{chapterId}/kanji-flashcards")
  public List<StudentKanjiFlashcardService.ChapterCard> chapterCards(
    @PathVariable long chapterId,
    Principal p
  ) {
    return service.chapterCards(chapterId, p, false);
  }

  @GetMapping("/moderator/kanji/chapters/{chapterId}/flashcards")
  @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR','MODERATOR')")
  public List<StudentKanjiFlashcardService.ChapterCard> preview(
    @PathVariable long chapterId,
    Principal p
  ) {
    return service.chapterCards(chapterId, p, true);
  }
}
