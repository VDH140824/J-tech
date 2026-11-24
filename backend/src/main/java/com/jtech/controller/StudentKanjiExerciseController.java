package com.jtech.controller;

import com.jtech.service.StudentKanjiExerciseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/student/lessons/{lessonId}/kanji-exercises")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT','STUDENT')")
public class StudentKanjiExerciseController {
    private final StudentKanjiExerciseService service;

    @GetMapping
    public List<StudentKanjiExerciseService.ExerciseQuestion> questions(Principal p, @PathVariable long lessonId) {
        return service.questions(p, lessonId);
    }

    public record Submission(@NotEmpty List<@NotNull Long> questionIds,
        @NotNull Map<Long, StudentKanjiExerciseService.Answer> answers) {}

    @PostMapping("/submit")
    public StudentKanjiExerciseService.Result submit(Principal p, @PathVariable long lessonId, @Valid @RequestBody Submission body) {
        return service.submit(p, lessonId, body.questionIds(), body.answers());
    }
}
