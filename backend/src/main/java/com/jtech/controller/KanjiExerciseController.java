package com.jtech.controller;

import com.jtech.dto.request.KanjiExerciseRequest;
import com.jtech.dto.response.KanjiExerciseResponse;
import com.jtech.entity.Question;
import com.jtech.service.KanjiExerciseService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestController
@RequestMapping("/moderator/kanji/lessons/{lessonId}/exercises")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
public class KanjiExerciseController {

  private final KanjiExerciseService service;

  public KanjiExerciseController(KanjiExerciseService service) {
    this.service = service;
  }

  @GetMapping
  public Page<KanjiExerciseResponse> list(
    Principal p,
    @PathVariable long lessonId,
    @RequestParam(required = false) Question.QuestionStatus status,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
  ) {
    return service.list(p, lessonId, status, page, size);
  }

  @GetMapping("/{id}")
  public KanjiExerciseResponse detail(
    Principal p,
    @PathVariable long lessonId,
    @PathVariable long id
  ) {
    return service.detail(p, lessonId, id);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public KanjiExerciseResponse create(
    Principal p,
    @PathVariable long lessonId,
    @Valid @RequestBody KanjiExerciseRequest r
  ) {
    return service.save(p, lessonId, null, r);
  }

  @PutMapping("/{id}")
  public KanjiExerciseResponse update(
    Principal p,
    @PathVariable long lessonId,
    @PathVariable long id,
    @Valid @RequestBody KanjiExerciseRequest r
  ) {
    return service.save(p, lessonId, id, r);
  }

  @DeleteMapping("/{id}")
  public Map<String, String> delete(
    Principal p,
    @PathVariable long lessonId,
    @PathVariable long id
  ) {
    return Map.of("result", service.delete(p, lessonId, id));
  }

  @ExceptionHandler({
    HttpMessageNotReadableException.class,
    MethodArgumentTypeMismatchException.class,
  })
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public Map<String, String> invalidRequest(Exception ignored) {
    return Map.of(
      "message",
      "Dữ liệu câu hỏi hoặc tham số phân trang không hợp lệ."
    );
  }
}
