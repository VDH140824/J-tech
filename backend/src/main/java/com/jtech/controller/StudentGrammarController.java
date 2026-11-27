package com.jtech.controller;

import com.jtech.dto.response.StudentGrammarResponse;
import com.jtech.service.StudentGrammarService;
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

/** Màn Grammar của học viên: /api/student/grammar — tài liệu, luyện tập, mini test, kết quả. */
@RestController
@RequestMapping("/student/grammar")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'STUDENT')")
public class StudentGrammarController {

    /** Câu trả lời: questionId → đáp án (MCQ: khóa lựa chọn; điền: chữ; nối: JSON {vế trái: vế phải}). */
    public record Answers(Map<String, String> answers) {
    }

    /** Bài tập: các câu đã được phát (5 câu ngẫu nhiên) + câu trả lời. */
    public record ExerciseAnswers(List<Long> questionIds, Map<String, String> answers) {
    }

    private final StudentGrammarService service;

    public StudentGrammarController(StudentGrammarService service) {
        this.service = service;
    }

    /** Material Grammar: điểm ngữ pháp của bài + tình trạng luyện tập / mini test. */
    @GetMapping("/lessons/{lessonId}")
    public ResponseEntity<StudentGrammarResponse.Lesson> lesson(@PathVariable long lessonId, Principal principal) {
        return ResponseEntity.ok(service.lesson(lessonId, principal.getName()));
    }

    /** Grammar Exercise: câu luyện tập (không kèm đáp án). */
    @GetMapping("/lessons/{lessonId}/exercise")
    public ResponseEntity<StudentGrammarResponse.Exercise> exercise(@PathVariable long lessonId) {
        return ResponseEntity.ok(service.exercise(lessonId));
    }

    /** Grammar Exercise: chấm bài luyện tập. */
    @PostMapping("/lessons/{lessonId}/exercise/check")
    public ResponseEntity<StudentGrammarResponse.ExerciseResult> check(@PathVariable long lessonId,
            @RequestBody ExerciseAnswers body, Principal principal) {
        return ResponseEntity.ok(service.checkExercise(lessonId, body.questionIds(), body.answers(), principal.getName()));
    }

    /** Mini test Grammar: bắt đầu hoặc tiếp tục lượt làm. */
    @PostMapping("/mini-tests/{testId}/start")
    public ResponseEntity<StudentGrammarResponse.Attempt> start(@PathVariable long testId, Principal principal) {
        return ResponseEntity.ok(service.start(testId, principal.getName()));
    }

    @GetMapping("/attempts/{attemptId}")
    public ResponseEntity<StudentGrammarResponse.Attempt> attempt(@PathVariable long attemptId, Principal principal) {
        return ResponseEntity.ok(service.attempt(attemptId, principal.getName()));
    }

    /** Lưu tạm câu trả lời. */
    @PutMapping("/attempts/{attemptId}/answers")
    public ResponseEntity<Void> save(@PathVariable long attemptId, @RequestBody Answers body, Principal principal) {
        service.saveAnswers(attemptId, body.answers(), principal.getName());
        return ResponseEntity.noContent().build();
    }

    /** Nộp bài → Mini test Grammar result. */
    @PostMapping("/attempts/{attemptId}/submit")
    public ResponseEntity<StudentGrammarResponse.AttemptResult> submit(@PathVariable long attemptId,
            @RequestBody Answers body, Principal principal) {
        return ResponseEntity.ok(service.submit(attemptId, body.answers(), principal.getName()));
    }

    /** Mini test Grammar result (xem lại). */
    @GetMapping("/attempts/{attemptId}/result")
    public ResponseEntity<StudentGrammarResponse.AttemptResult> result(@PathVariable long attemptId,
            Principal principal) {
        return ResponseEntity.ok(service.result(attemptId, principal.getName()));
    }
}
