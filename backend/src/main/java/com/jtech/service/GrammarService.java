package com.jtech.service;

import com.jtech.dto.request.GrammarCreateRequest;
import com.jtech.dto.response.GrammarDetailResponse;
import com.jtech.entity.Grammar;
import com.jtech.entity.Lesson;
import com.jtech.repository.GrammarRepository;
import com.jtech.repository.LessonRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class GrammarService {
    private final GrammarRepository grammarRepository;
    private final LessonRepository lessonRepository;

    public GrammarService(GrammarRepository grammarRepository, LessonRepository lessonRepository) {
        this.grammarRepository = grammarRepository;
        this.lessonRepository = lessonRepository;
    }

    @Transactional(readOnly = true)
    public GrammarDetailResponse getById(Long id) {
        Grammar grammar = grammarRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grammar not found"));
        return toResponse(grammar);
    }

    @Transactional(readOnly = true)
    public List<GrammarDetailResponse> getByLesson(Long lessonId, Grammar.Status status) {
        if (!lessonRepository.existsById(lessonId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found");
        }
        List<Grammar> grammars = status == null
                ? grammarRepository.findByLessonIdOrderByDisplayOrderAscIdAsc(lessonId)
                : grammarRepository.findByLessonIdAndStatusOrderByDisplayOrderAscIdAsc(lessonId, status);
        return grammars.stream().map(this::toResponse).toList();
    }

    @Transactional
    public GrammarDetailResponse create(Long lessonId, GrammarCreateRequest request) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found"));
        if (lesson.getSkillType() != Lesson.SkillType.GRAMMAR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Lesson is not a grammar lesson");
        }
        if ((request.videoUrl() == null || request.videoUrl().isBlank()) !=
                (request.videoPublicId() == null || request.videoPublicId().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Video URL and public ID must be provided together");
        }

        Grammar grammar = Grammar.builder()
                .lesson(lesson)
                .structureName(request.structureName().trim())
                .meaningVi(request.meaningVi().trim())
                .usageExplanation(request.usageExplanation().trim())
                .exampleJp(request.exampleJp().trim())
                .exampleVi(request.exampleVi().trim())
                .videoUrl(request.videoUrl())
                .videoPublicId(request.videoPublicId())
                .videoDurationSec(request.videoDurationSec())
                .displayOrder(request.displayOrder() != null ? request.displayOrder() : 0)
                .status(request.status() != null ? request.status() : Grammar.Status.DRAFT)
                .build();
        return toResponse(grammarRepository.save(grammar));
    }

    private GrammarDetailResponse toResponse(Grammar grammar) {
        return new GrammarDetailResponse(
                grammar.getId(),
                grammar.getLesson().getId(),
                grammar.getStructureName(),
                grammar.getMeaningVi(),
                grammar.getUsageExplanation(),
                grammar.getExampleJp(),
                grammar.getExampleVi(),
                grammar.getVideoUrl(),
                grammar.getVideoDurationSec(),
                grammar.getDisplayOrder(),
                grammar.getStatus(),
                grammar.getCreatedAt(),
                grammar.getUpdatedAt()
        );
    }
}
