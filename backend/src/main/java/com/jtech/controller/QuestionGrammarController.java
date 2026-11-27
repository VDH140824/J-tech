package com.jtech.controller;

import com.jtech.dto.request.QuestionGrammarUpdateRequest;
import com.jtech.dto.request.QuestionGrammarCreateRequest;
import com.jtech.dto.response.QuestionGrammarResponse;
import com.jtech.dto.response.GrammarQuestionImportResponse;
import com.jtech.exception.GrammarQuestionImportException;
import com.jtech.service.QuestionGrammarService;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
public class QuestionGrammarController {
    private final QuestionGrammarService questionGrammarService;

    public QuestionGrammarController(QuestionGrammarService questionGrammarService) {
        this.questionGrammarService = questionGrammarService;
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping(value = "/grammar-questions/import", consumes = "multipart/form-data")
    public ResponseEntity<GrammarQuestionImportResponse> importGrammarQuestions(
            @RequestParam Long grammarId,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        return ResponseEntity.ok(questionGrammarService.importGrammarQuestions(grammarId, file, authentication.getName()));
    }

    @ExceptionHandler(GrammarQuestionImportException.class)
    public ResponseEntity<GrammarQuestionImportResponse.Failure> handleImportValidation(
            GrammarQuestionImportException exception) {
        return ResponseEntity.badRequest().body(new GrammarQuestionImportResponse.Failure(
                exception.getMessage(), exception.getErrors()));
    }

    @ExceptionHandler({MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> handleMissingImportFields() {
        return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn file Excel và ID ngữ pháp hợp lệ."));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleOversizedImport() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of("message", "File Excel không được vượt quá 5 MB."));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @GetMapping("/grammar-questions")
    public ResponseEntity<List<QuestionGrammarResponse>> getAllGrammarQuestions(@RequestParam Long grammarId) {
        return ResponseEntity.ok(questionGrammarService.getAllGrammarQuestions(grammarId));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @PostMapping("/questions")
    public ResponseEntity<QuestionGrammarResponse> createQuestionGrammar(
            @Valid @RequestBody QuestionGrammarCreateRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(questionGrammarService.createQuestionGrammar(request, authentication.getName()));
    }

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
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

    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
    @DeleteMapping("/questions/{id}")
    public ResponseEntity<?> deleteQuestionGrammar(@PathVariable Long id) {
        try {
            questionGrammarService.deleteQuestionGrammar(id);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException exception) {
            return ResponseEntity.notFound().build();
        } catch (DataIntegrityViolationException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Câu hỏi đang được sử dụng nên không thể xóa."));
        }
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleInvalidQuestionBody() {
        return ResponseEntity.badRequest().body(Map.of("message", "Dữ liệu câu hỏi không hợp lệ."));
    }
}
