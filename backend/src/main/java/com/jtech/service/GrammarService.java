package com.jtech.service;

import com.jtech.dto.request.GrammarCreateRequest;
import com.jtech.dto.request.GrammarUpdateRequest;
import com.jtech.dto.response.CloudinaryUploadResponse;
import com.jtech.dto.response.GrammarDetailResponse;
import com.jtech.entity.Grammar;
import com.jtech.entity.Lesson;
import com.jtech.repository.GrammarRepository;
import com.jtech.repository.LessonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class GrammarService {
    private static final Logger logger = LoggerFactory.getLogger(GrammarService.class);
    private final GrammarRepository grammarRepository;
    private final LessonRepository lessonRepository;
    private final CloudinaryService cloudinaryService;

    public GrammarService(GrammarRepository grammarRepository, LessonRepository lessonRepository,
                          CloudinaryService cloudinaryService) {
        this.grammarRepository = grammarRepository;
        this.lessonRepository = lessonRepository;
        this.cloudinaryService = cloudinaryService;
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

    @Transactional
    public GrammarDetailResponse update(Long id, GrammarUpdateRequest request, MultipartFile videoFile) {
        Grammar grammar = grammarRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Grammar not found"));

        if ((request.videoUrl() != null && !request.videoUrl().isBlank())
                || (request.videoPublicId() != null && !request.videoPublicId().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Video replacement requires a video file");
        }

        String previousVideoPublicId = grammar.getVideoPublicId();
        grammar.setStructureName(request.structureName().trim());
        grammar.setMeaningVi(request.meaningVi().trim());
        grammar.setUsageExplanation(request.usageExplanation().trim());
        grammar.setExampleJp(request.exampleJp().trim());
        grammar.setExampleVi(request.exampleVi().trim());
        grammar.setDisplayOrder(request.displayOrder());
        grammar.setStatus(request.status());

        // Keep the current video when the update contains no new file.
        if (videoFile != null) {
            CloudinaryUploadResponse uploaded;
            try {
                uploaded = cloudinaryService.uploadGrammarVideo(videoFile);
            } catch (IllegalArgumentException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
            } catch (IllegalStateException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Video upload failed", exception);
            }

            String uploadedPublicId = uploaded.getPublicId();
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) {
                        try {
                            cloudinaryService.deleteVideo(uploadedPublicId);
                        } catch (RuntimeException exception) {
                            logger.warn("Grammar update failed and the new Cloudinary video could not be deleted: {}",
                                    uploadedPublicId, exception);
                        }
                    }
                }
            });

            grammar.setVideoUrl(uploaded.getVideoUrl());
            grammar.setVideoPublicId(uploadedPublicId);
            grammar.setVideoDurationSec(uploaded.getDuration() == null
                    ? null : Math.toIntExact((long) Math.ceil(uploaded.getDuration())));
        }

        Grammar updated = grammarRepository.save(grammar);
        String currentVideoPublicId = updated.getVideoPublicId();
        if (previousVideoPublicId != null && !previousVideoPublicId.isBlank()
                && !previousVideoPublicId.equals(currentVideoPublicId)) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        cloudinaryService.deleteVideo(previousVideoPublicId);
                    } catch (RuntimeException exception) {
                        logger.warn("Grammar was updated, but the previous Cloudinary video could not be deleted: {}",
                                previousVideoPublicId, exception);
                    }
                }
            });
        }
        return toResponse(updated);
    }

    @Transactional
    public boolean delete(Long id) {
        Grammar grammar = grammarRepository.findById(id).orElse(null);
        if (grammar == null) {
            return false;
        }

        String videoPublicId = grammar.getVideoPublicId();
        grammarRepository.deleteLearningProgressByGrammarId(id);
        grammarRepository.detachStudySessionsByGrammarId(id);
        grammarRepository.delete(grammar);

        if (videoPublicId != null && !videoPublicId.isBlank()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        cloudinaryService.deleteVideo(videoPublicId);
                    } catch (RuntimeException exception) {
                        logger.warn("Grammar was deleted, but its Cloudinary video could not be deleted: {}",
                                videoPublicId, exception);
                    }
                }
            });
        }
        return true;
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
                grammar.getVideoPublicId(),
                grammar.getVideoDurationSec(),
                grammar.getDisplayOrder(),
                grammar.getStatus(),
                grammar.getCreatedAt(),
                grammar.getUpdatedAt()
        );
    }
}
