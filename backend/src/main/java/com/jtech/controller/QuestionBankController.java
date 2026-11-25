package com.jtech.controller;

import com.jtech.dto.request.QuestionBankRequest;
import com.jtech.dto.response.QuestionBankResponse;
import com.jtech.entity.Question;
import com.jtech.repository.QuestionBankQueryRepository;
import com.jtech.service.QuestionBankService;
import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/moderator/question-bank")
@PreAuthorize("hasAnyAuthority('ROLE_MODERATOR', 'MODERATOR')")
public class QuestionBankController {

    private final QuestionBankService service;

    public QuestionBankController(QuestionBankService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<QuestionBankResponse.Page> search(
            @RequestParam(required = false) Question.Skill skill,
            @RequestParam(required = false) Question.QuestionType questionType,
            @RequestParam(required = false) Question.QuestionStatus status,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) Long chapterId,
            @RequestParam(required = false) Long lessonId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long testId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        var filter = new QuestionBankQueryRepository.Filter(skill, questionType, status, courseId, chapterId, lessonId, keyword, testId);
        return ResponseEntity.ok(service.search(filter, page, size));
    }

    @GetMapping("/targets")
    public ResponseEntity<QuestionBankResponse.Targets> targets() {
        return ResponseEntity.ok(service.targets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionBankResponse.Detail> detail(@PathVariable Long id) {
        return ResponseEntity.ok(service.detail(id));
    }

    @PostMapping
    public ResponseEntity<QuestionBankResponse.Detail> create(@Valid @RequestBody QuestionBankRequest request,
            Principal principal) {
        QuestionBankResponse.Detail created = service.create(request, principal.getName());
        return ResponseEntity.created(URI.create("/api/moderator/question-bank/" + created.summary().id())).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionBankResponse.Detail> update(@PathVariable Long id,
            @Valid @RequestBody QuestionBankRequest request, Principal principal) {
        return ResponseEntity.ok(service.update(id, request, principal.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<QuestionBankResponse.DeleteResult> delete(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.delete(id, principal.getName()));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<QuestionBankResponse.DeleteResult> archive(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(service.archive(id, principal.getName()));
    }
}
