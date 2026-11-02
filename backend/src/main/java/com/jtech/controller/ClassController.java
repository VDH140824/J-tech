package com.jtech.controller;

import com.jtech.dto.response.ClassResponse;
import com.jtech.dto.request.ClassRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.jtech.service.ClassService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/classes")
public class ClassController {
    private final ClassService classService;

    public ClassController(ClassService classService) {
        this.classService = classService;
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<List<ClassResponse>> getMyClasses() {
        return ResponseEntity.ok(classService.getClassesByCurrentModerator());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<ClassResponse> createClass(@RequestBody ClassRequest request) {
        return ResponseEntity.status(201).body(classService.createClass(request));
    }
}
