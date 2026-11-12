package com.jtech.controller;

import com.jtech.dto.request.KanjiTestRequest.Answers;
import com.jtech.dto.response.KanjiTestResponse.Attempt;
import com.jtech.service.KanjiTestService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/student/kanji-tests")
@PreAuthorize("hasAnyAuthority('ROLE_STUDENT','STUDENT')")
public class StudentKanjiTestController {

  private final KanjiTestService service;

  public StudentKanjiTestController(KanjiTestService service) {
    this.service = service;
  }

  @PostMapping("/chapters/{chapterId}/{testId}/start")
  public Attempt start(
    @PathVariable long chapterId,
    @PathVariable long testId,
    Principal p
  ) {
    return service.start(chapterId, testId, p);
  }

  @GetMapping("/chapters/{chapterId}/latest")
  public Attempt latest(@PathVariable long chapterId, Principal p) {
    return service.latest(chapterId, p);
  }

  @GetMapping("/attempts/{id}")
  public Attempt get(@PathVariable long id, Principal p) {
    return service.attempt(id, p);
  }

  @PutMapping("/attempts/{id}/answers")
  public Attempt save(
    @PathVariable long id,
    @Valid @RequestBody Answers answers,
    Principal p
  ) {
    return service.answer(id, answers.answers(), false, p);
  }

  @PostMapping("/attempts/{id}/submit")
  public Attempt submit(
    @PathVariable long id,
    @Valid @RequestBody Answers answers,
    Principal p
  ) {
    return service.answer(id, answers.answers(), true, p);
  }
}
