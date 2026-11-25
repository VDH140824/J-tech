package com.jtech.controller;

import com.jtech.dto.response.StudentVocabularyChapterTestResponse;
import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.service.StudentVocabularyChapterTestService;
import com.jtech.service.VocabularyChapterTestService;
import com.jtech.service.StudentVocabularyFlashcardService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student/vocabulary/chapters/{chapterId}")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentVocabularyChapterController {

    private final StudentVocabularyFlashcardService flashcards;
    private final VocabularyChapterTestService tests;
    private final StudentVocabularyChapterTestService studentTests;

    public StudentVocabularyChapterController(
        StudentVocabularyFlashcardService flashcards,
        VocabularyChapterTestService tests,
        StudentVocabularyChapterTestService studentTests
    ) {
        this.flashcards = flashcards;
        this.tests = tests;
        this.studentTests = studentTests;
    }

    @GetMapping("/flashcards")
    public List<StudentVocabularyFlashcardService.StudentFlashcard> flashcards(
        @PathVariable Long chapterId,
        Principal principal
    ) {
        return flashcards.studentFlashcards(chapterId, principal);
    }

    @PutMapping("/flashcards/{vocabularyId}/progress")
    public void progress(
        @PathVariable Long chapterId,
        @PathVariable Long vocabularyId,
        @Valid @RequestBody Progress progress,
        Principal principal
    ) {
        flashcards.remember(chapterId, vocabularyId, progress.remembered(), principal);
    }

    @GetMapping("/test")
    public StudentVocabularyChapterTestResponse.Test test(@PathVariable Long chapterId, Principal principal) {
        return studentTests.test(chapterId, principal);
    }

    @PostMapping("/test/start")
    public StudentVocabularyChapterTestResponse.Attempt start(@PathVariable Long chapterId, Principal principal) {
        return studentTests.start(chapterId, principal);
    }

    @GetMapping("/attempts/{attemptId}")
    public StudentVocabularyChapterTestResponse.Attempt attempt(
        @PathVariable Long chapterId,
        @PathVariable Long attemptId,
        Principal principal
    ) {
        return studentTests.attempt(chapterId, attemptId, principal);
    }

    @PutMapping("/attempts/{attemptId}/answers")
    public ResponseEntity<Void> saveAnswers(
        @PathVariable Long chapterId,
        @PathVariable Long attemptId,
        @Valid @RequestBody Answers answers,
        Principal principal
    ) {
        studentTests.saveAnswers(chapterId, attemptId, answers.answers(), principal);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public StudentVocabularyChapterTestResponse.Result submitAttempt(
        @PathVariable Long chapterId,
        @PathVariable Long attemptId,
        @Valid @RequestBody Answers answers,
        Principal principal
    ) {
        return studentTests.submit(chapterId, attemptId, answers.answers(), principal);
    }

    @GetMapping("/attempts/{attemptId}/result")
    public StudentVocabularyChapterTestResponse.Result result(
        @PathVariable Long chapterId,
        @PathVariable Long attemptId,
        Principal principal
    ) {
        return studentTests.result(chapterId, attemptId, principal);
    }

    @PostMapping("/test/submit")
    public VocabularyTestResponse.Result submit(
        @PathVariable Long chapterId,
        @Valid @RequestBody Submission submission
    ) {
        return tests.submitStudentTest(
            chapterId,
            submission.testId(),
            submission.questionIds(),
            submission.answers()
        );
    }

    public record Submission(
        @NotNull Long testId,
        @NotEmpty List<@NotNull Long> questionIds,
        @NotNull Map<String, String> answers
    ) {}

    public record Answers(@NotNull Map<String, String> answers) {}

    public record Progress(@NotNull Boolean remembered) {}
}
