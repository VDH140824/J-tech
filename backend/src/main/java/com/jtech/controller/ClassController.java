package com.jtech.controller;

import com.jtech.dto.response.ClassResponse;
import com.jtech.dto.response.StudentResponse;
import com.jtech.dto.response.AddStudentsResponse;
import com.jtech.dto.request.AddStudentsRequest;
import org.springframework.data.domain.Page;
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
import java.util.Map;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.DeleteMapping;

@RestController
@RequestMapping("/classes")
public class ClassController {
    @DeleteMapping("/{id}/students/{studentId}")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<Void> removeStudent(@PathVariable Long id, @PathVariable Long studentId) {
        classService.removeStudent(id, studentId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/students")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<AddStudentsResponse> addStudents(@PathVariable Long id,
            @RequestBody AddStudentsRequest request) {
        return ResponseEntity.ok(classService.addStudents(id, request == null ? null : request.emails()));
    }

    @GetMapping("/{id}/students")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<Page<StudentResponse>> getClassStudents(@PathVariable Long id,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(classService.getClassStudents(id, search, status, page, size));
    }
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<Void> deleteClass(@PathVariable Long id) {
        classService.deleteClass(id);
        return ResponseEntity.noContent().build();
    }
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<ClassResponse> updateClass(@PathVariable Long id, @RequestBody ClassRequest request) {
        return ResponseEntity.ok(classService.updateClass(id, request));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleClassNotFound(EntityNotFoundException exception) {
        return ResponseEntity.status(404).body(Map.of("message", exception.getMessage()));
    }
    private final ClassService classService;

    public ClassController(ClassService classService) {
        this.classService = classService;
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<List<ClassResponse>> getMyClasses() {
        return ResponseEntity.ok(classService.getClassesByCurrentModerator());
    }

    @GetMapping("/enrolled")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    public ResponseEntity<List<ClassResponse>> getEnrolledClasses() {
        return ResponseEntity.ok(classService.getClassesByCurrentStudent());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_MODERATOR')")
    public ResponseEntity<ClassResponse> createClass(@RequestBody ClassRequest request) {
        return ResponseEntity.status(201).body(classService.createClass(request));
    }
}
