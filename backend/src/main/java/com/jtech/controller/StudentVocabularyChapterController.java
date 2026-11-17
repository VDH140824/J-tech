package com.jtech.controller;

import com.jtech.dto.response.StudentVocabularyExercise;
import com.jtech.dto.response.VocabularyTestResponse;
import com.jtech.service.VocabularyChapterService;
import com.jtech.service.VocabularyChapterTestService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student/vocabulary/chapters/{chapterId}")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentVocabularyChapterController {

    private final VocabularyChapterService flashcards;
    private final VocabularyChapterTestService tests;

    public StudentVocabularyChapterController(
        VocabularyChapterService flashcards,
        VocabularyChapterTestService tests
    ) {
        this.flashcards = flashcards;
        this.tests = tests;
    }

    @GetMapping("/flashcards")
    public List<VocabularyChapterService.Flashcard> flashcards(@PathVariable Long chapterId) {
        return flashcards.studentFlashcards(chapterId);
    }

    @GetMapping("/test")
    public StudentVocabularyExercise test(@PathVariable Long chapterId) {
        return tests.studentTest(chapterId);
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
}
