package com.jtech.controller;

import com.jtech.dto.request.CommentRequest;
import com.jtech.dto.request.UpdateCommentRequest;
import com.jtech.dto.response.CommentResponse;
import com.jtech.service.CommentService;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/classes/{classId}/posts/{postId}/comments")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR','ROLE_STUDENT')")
public class CommentController {
    private final CommentService service;
    public CommentController(CommentService service) { this.service = service; }

    @GetMapping
    public List<CommentResponse> get(@PathVariable Long classId, @PathVariable Long postId) {
        return service.getComments(classId, postId);
    }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CommentResponse> create(@PathVariable Long classId, @PathVariable Long postId,
            @RequestPart("request") CommentRequest request,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createComment(classId, postId, request, attachment));
    }
    @PutMapping(value = "/{commentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CommentResponse update(@PathVariable Long classId, @PathVariable Long postId,
            @PathVariable Long commentId, @RequestPart("request") UpdateCommentRequest request,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment) {
        return service.updateComment(classId, postId, commentId, request, attachment);
    }
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable Long classId, @PathVariable Long postId,
            @PathVariable Long commentId) {
        service.deleteComment(classId, postId, commentId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> missing(EntityNotFoundException error) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", error.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> forbidden(AccessDeniedException error) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", error.getMessage()));
    }
}
