package com.jtech.controller;

import com.jtech.dto.response.PostResponse;
import com.jtech.dto.request.PostRequest;
import com.jtech.service.PostService;
import com.jtech.dto.response.PostDetailResponse;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/classes/{classId}/posts")
public class PostController {
    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR','ROLE_STUDENT')")
    public ResponseEntity<List<PostResponse>> getPostsByClass(@PathVariable Long classId) {
        return ResponseEntity.ok(postService.getPostsByClass(classId));
    }

    @GetMapping("/{postId}")
    @PreAuthorize("hasAnyAuthority('ROLE_MODERATOR','ROLE_STUDENT')")
    public ResponseEntity<PostDetailResponse> getDetail(@PathVariable Long classId, @PathVariable Long postId) {
        return ResponseEntity.ok(postService.getPostDetail(classId, postId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<PostResponse> createPost(@PathVariable Long classId,
            @RequestPart("request") PostRequest request,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(postService.createPost(classId, request, attachment));
    }

    @PutMapping(value = "/{postId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<PostResponse> updatePost(@PathVariable Long classId, @PathVariable Long postId,
            @RequestPart("request") PostRequest request,
            @RequestPart(value = "attachment", required = false) MultipartFile attachment) {
        return ResponseEntity.ok(postService.updatePost(classId, postId, request, attachment));
    }

    @DeleteMapping("/{postId}")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<Void> deletePost(@PathVariable Long classId, @PathVariable Long postId) {
        postService.deletePost(classId, postId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(EntityNotFoundException exception) {
        return ResponseEntity.status(404).body(Map.of("message", exception.getMessage()));
    }
}
