package com.jtech.controller;

import com.jtech.service.FeedbackService;
import com.jtech.service.StudentGameResultService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/student/games")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentGameController {
    public record ResultRequest(
        @NotBlank @Size(max = 36) String sessionId,
        @NotBlank @Size(max = 32) String gameType,
        @NotBlank @Size(max = 255) String title,
        @NotNull @Min(0) @Max(1_000_000) Integer correctCount,
        @NotNull @Min(1) @Max(1_000_000) Integer totalCount
    ) {}

    private final StudentGameResultService results;
    private final FeedbackService access;

    public StudentGameController(StudentGameResultService results, FeedbackService access) {
        this.results = results;
        this.access = access;
    }

    @PostMapping("/results")
    public StudentGameResultService.GameResult saveResult(
        Principal principal,
        @Valid @RequestBody ResultRequest request
    ) {
        long studentId = access.actor(principal, "STUDENT").getUserId();
        return results.saveResult(studentId, request);
    }
}
