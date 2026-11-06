package com.jtech.controller;

import com.jtech.service.*;
import com.jtech.repository.LearningProgressRepository.ContentType;
import java.security.Principal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/progress")
public class LearningActivityController {
    public record ContentCompletion(ContentType contentType, long contentId) {}
    private final FeedbackService access;
    private final LearningActivityService activities;
    public LearningActivityController(FeedbackService access, LearningActivityService activities) {
        this.access = access; this.activities = activities;
    }
    @PostMapping("/completions")
    public LearningActivityService.CompletionResult recordCompletion(Principal p, @RequestBody ContentCompletion request) {
        return activities.recordContentCompletion(access.actor(p, "STUDENT").getUserId(), request.contentType(), request.contentId());
    }
}
