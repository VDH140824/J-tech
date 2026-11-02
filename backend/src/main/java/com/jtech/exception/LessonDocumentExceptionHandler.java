package com.jtech.exception;

import com.jtech.controller.LessonController;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Order(-1) @RestControllerAdvice(assignableTypes = LessonController.class)
public class LessonDocumentExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message", e.getReason() == null ? "Không thể xử lý yêu cầu." : e.getReason()));
    }
}
