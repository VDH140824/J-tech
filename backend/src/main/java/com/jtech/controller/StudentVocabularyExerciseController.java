package com.jtech.controller;

import com.jtech.dto.response.StudentVocabularyExercise;
import com.jtech.dto.response.VocabularyMiniTestResponse;
import com.jtech.service.VocabularyMiniTestService;
import com.jtech.service.FeedbackService;
import com.jtech.service.LearningActivityService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentVocabularyExerciseController {
    private final VocabularyMiniTestService service;
    private final FeedbackService access;
    private final LearningActivityService activities;

    public StudentVocabularyExerciseController(
        VocabularyMiniTestService service, FeedbackService access, LearningActivityService activities
    ) {
        this.service = service;
        this.access = access;
        this.activities = activities;
    }

    @GetMapping("/lessons/{lessonId}/vocabulary-exercise")
    public StudentVocabularyExercise get(@PathVariable Long lessonId, Authentication authentication) {
        return service.studentExercise(lessonId, authentication);
    }

    @PostMapping("/vocabulary-exercises/{id}/submit")
    public VocabularyMiniTestResponse.Result submit(
        @PathVariable Long id,
        @Valid @RequestBody Submission submission,
        Authentication authentication
    ) {
        long studentId = access.actor(authentication, "STUDENT").getUserId();
        var graded = service.submitExercise(id, submission.questionIds(), submission.answers(), authentication);
        activities.recordExerciseCompletion(studentId, id, graded.lessonId(), graded.result(), submission.answers());
        return graded.result();
    }

    public record Submission(@NotEmpty List<@NotNull Long> questionIds, @NotNull Map<String, String> answers) {}
}
