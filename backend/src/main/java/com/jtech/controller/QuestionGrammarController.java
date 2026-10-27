package com.jtech.controller;

import com.jtech.dto.request.QuestionGrammarUpdateRequest;
import com.jtech.dto.request.QuestionGrammarCreateRequest;
import com.jtech.dto.response.QuestionGrammarResponse;
import com.jtech.service.QuestionGrammarService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class QuestionGrammarController {
    private final QuestionGrammarService questionGrammarService;

    public QuestionGrammarController(QuestionGrammarService questionGrammarService) {
        this.questionGrammarService = questionGrammarService;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @GetMapping("/grammar-questions")
    public ResponseEntity<List<QuestionGrammarResponse>> getAllGrammarQuestions() {
        return ResponseEntity.ok(questionGrammarService.getAllGrammarQuestions());
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping("/questions")
    public ResponseEntity<QuestionGrammarResponse> createQuestionGrammar(
            @Valid @RequestBody QuestionGrammarCreateRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(questionGrammarService.createQuestionGrammar(request, authentication.getName()));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ADMIN', 'ROLE_MODERATOR', 'MODERATOR')")
    @PutMapping("/questions/{id}")
    public ResponseEntity<QuestionGrammarResponse> updateQuestionGrammar(
            @PathVariable Long id,
            @Valid @RequestBody QuestionGrammarUpdateRequest request,
            Authentication authentication) {
        try {
            return ResponseEntity.ok(questionGrammarService.updateQuestionGrammar(id, request, authentication.getName()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        }
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleInvalidQuestionBody() {
        return ResponseEntity.badRequest().body(Map.of("message", "Dữ liệu câu hỏi không hợp lệ."));
    }
}
