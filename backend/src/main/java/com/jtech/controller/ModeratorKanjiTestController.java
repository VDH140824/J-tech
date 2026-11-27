package com.jtech.controller;

import com.jtech.dto.request.KanjiTestRequest;
import com.jtech.dto.response.KanjiTestResponse;
import com.jtech.service.KanjiTestService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/moderator/kanji/chapters/{chapterId}/test")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR','MODERATOR')")
public class ModeratorKanjiTestController {

  private final KanjiTestService service;

  public ModeratorKanjiTestController(KanjiTestService service) {
    this.service = service;
  }

  @GetMapping
  public KanjiTestResponse get(@PathVariable long chapterId, Principal p) {
    return service.setup(chapterId, p);
  }

  @PutMapping
  public KanjiTestResponse save(
    @PathVariable long chapterId,
    @Valid @RequestBody KanjiTestRequest request,
    Principal p
  ) {
    return service.save(chapterId, request, p);
  }
}
