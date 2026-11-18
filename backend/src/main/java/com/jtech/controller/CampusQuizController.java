package com.jtech.controller;

import com.jtech.campus.CampusQuizSessionStore.Rejection;
import com.jtech.campus.CampusQuizSessionStore.SubmissionException;
import com.jtech.dto.campusquiz.CampusQuizDtos.CourseSummary;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizError;
import com.jtech.dto.campusquiz.CampusQuizDtos.QuizResult;
import com.jtech.dto.campusquiz.CampusQuizDtos.StartRequest;
import com.jtech.dto.campusquiz.CampusQuizDtos.StartResponse;
import com.jtech.dto.campusquiz.CampusQuizDtos.SubmitRequest;
import com.jtech.service.CampusQuizService;
import com.jtech.service.CampusQuizService.QuizException;
import com.jtech.service.FeedbackService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/campus-quiz")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class CampusQuizController {
    private final CampusQuizService quiz;
    private final FeedbackService access;

    public CampusQuizController(CampusQuizService quiz, FeedbackService access) {
        this.quiz = quiz;
        this.access = access;
    }

    @GetMapping("/courses")
    public List<CourseSummary> courses(Principal principal) {
        access.actor(principal, "STUDENT");
        return quiz.getAvailableCourses();
    }

    @PostMapping("/start")
    public StartResponse start(Principal principal, @Valid @RequestBody StartRequest request) {
        return quiz.startQuiz(request.courseId(), access.actor(principal, "STUDENT").getUserId());
    }

    @PostMapping("/submit")
    public QuizResult submit(Principal principal, @Valid @RequestBody SubmitRequest request) {
        return quiz.submitQuiz(access.actor(principal, "STUDENT").getUserId(), request);
    }

    @ExceptionHandler(QuizException.class)
    public ResponseEntity<QuizError> quizError(QuizException ex) {
        return ResponseEntity.status(ex.status()).body(ex.error());
    }

    @ExceptionHandler(SubmissionException.class)
    public ResponseEntity<QuizError> submissionError(SubmissionException ex) {
        String message = switch (ex.reason()) {
            case SESSION_UNAVAILABLE -> "Phiên làm bài đã hết hạn hoặc không còn khả dụng. Vui lòng bắt đầu bài mới.";
            case DEADLINE_PASSED -> "Đã hết thời gian làm bài.";
            case DEADLINE_NOT_REACHED -> "Chưa đến thời điểm tự động nộp bài. Vui lòng thử lại.";
            case INVALID_ANSWERS -> "Câu trả lời không hợp lệ cho phiên làm bài này.";
            case SUBMISSION_IN_PROGRESS -> "Bài kiểm tra đang được xử lý. Vui lòng thử nộp lại sau.";
            case SUBMISSION_ANSWERS_CHANGED -> "Vui lòng gửi lại cùng bộ đáp án đã nộp.";
        };
        HttpStatus status = ex.reason() == Rejection.SUBMISSION_IN_PROGRESS
            ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(new QuizError(ex.reason().name(), message, null));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<QuizError> invalidRequest() {
        return ResponseEntity.badRequest().body(new QuizError("INVALID_REQUEST", "Dữ liệu bài kiểm tra không hợp lệ.", null));
    }
}
