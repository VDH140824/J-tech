package com.jtech.controller;

import com.jtech.service.FeedbackService;
import com.jtech.service.StreakService;
import java.security.Principal;
import org.springframework.jdbc.BadSqlGrammarException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class StreakController {
    private final FeedbackService access;
    private final StreakService streaks;
    public StreakController(FeedbackService access, StreakService streaks) {
        this.access = access;
        this.streaks = streaks;
    }
    @GetMapping("/streak")
    public StreakService.Summary summary(Principal principal) {
        long studentId = access.actor(principal, "STUDENT").getUserId();
        try {
            return streaks.getStreakSummary(studentId);
        } catch (BadSqlGrammarException error) {
            var cause = error.getSQLException();
            if (cause != null && "42S02".equals(cause.getSQLState())) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Thiếu bảng study_session hoặc streak_milestone. Kiểm tra schema J-Tech và khởi động lại backend.",
                    error);
            }
            throw error;
        }
    }
}
