package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.jtech.dto.request.LessonRequest;
import com.jtech.dto.response.LessonResponse;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class LessonService {

    private final LessonRepository lessonRepository;
    private final ChapterRepository chapterRepository;
    private final Validator validator;
    private final CloudinaryService cloudinary;
    private final KanjiService kanjiService;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper =
        new com.fasterxml.jackson.databind.ObjectMapper();

    public LessonService(
        LessonRepository lessonRepository,
        ChapterRepository chapterRepository,
        Validator validator,
        CloudinaryService cloudinary
    ) {
        this(lessonRepository, chapterRepository, validator, cloudinary, null);
    }

    @Autowired
    public LessonService(
        LessonRepository lessonRepository,
        ChapterRepository chapterRepository,
        Validator validator,
        CloudinaryService cloudinary,
        KanjiService kanjiService
    ) {
        this.lessonRepository = lessonRepository;
        this.chapterRepository = chapterRepository;
        this.validator = validator;
        this.cloudinary = cloudinary;
        this.kanjiService = kanjiService;
    }

    public List<LessonResponse> getLessonsByChapter(
        Long chapterId,
        Lesson.SkillType skillType,
        Course.Status status
    ) {
        List<Lesson> lessons;
        if (skillType != null && status != null) {
            lessons =
                lessonRepository.findByChapterIdAndSkillTypeAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(
                    chapterId,
                    skillType,
                    status
                );
        } else if (skillType != null) {
            lessons =
                lessonRepository.findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(
                    chapterId,
                    skillType
                );
        } else if (status != null) {
            lessons =
                lessonRepository.findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(
                    chapterId,
                    status
                );
        } else {
            lessons = lessonRepository.findByChapterIdOrderByDisplayOrderAscLessonNoAscIdAsc(
                chapterId
            );
        }
        return lessons.stream().map(this::mapToResponse).toList();
    }

    public List<LessonResponse> getLessonsByCourseAndChapter(
        Long courseId,
        Long chapterId,
        Lesson.SkillType skillType,
        Course.Status status
    ) {
        if (chapterRepository.findByIdAndCourseId(chapterId, courseId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return getLessonsByChapter(chapterId, skillType, status);
    }

    public LessonResponse getLessonById(Long id) {
        return lessonRepository
            .findById(id)
            .map(this::mapToResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public LessonResponse createLesson(
        Long courseId,
        Long chapterId,
        LessonRequest request,
        org.springframework.web.multipart.MultipartFile file
    ) {
        validate(request);
        Chapter chapter = (
            courseId == null
                ? chapterRepository.findById(chapterId)
                : chapterRepository.findByIdAndCourseId(chapterId, courseId)
        ).orElseThrow(() ->
            new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Chapter not found with id: " + chapterId
            )
        );
        Lesson.SkillType skill =
            request.skillType() == null ? Lesson.SkillType.GRAMMAR : request.skillType();
        if (
            lessonRepository.existsByChapterIdAndSkillTypeAndDisplayOrder(
                chapterId,
                skill,
                request.displayOrder()
            )
        ) {
            throw duplicateOrder(request.displayOrder());
        }
        Lesson lesson = Lesson.builder()
            .chapter(chapter)
            .skillType(skill)
            .lessonNo(request.lessonNo())
            .title(request.title())
            .description(request.description())
            .documents(
                skill == Lesson.SkillType.KANJI && kanjiService != null
                    ? kanjiService.documents(request.documents(), file)
                    : skill == Lesson.SkillType.VOCABULARY
                      ? vocabularyDocuments(request.documents(), null, file)
                      : skill == Lesson.SkillType.GRAMMAR && file == null
                        ? null
                        : uploadDocument(file, null)
            )
            .displayOrder(request.displayOrder())
            .status(request.status() == null ? Course.Status.DRAFT : request.status())
            .build();
        return mapToResponse(lessonRepository.save(lesson));
    }

    @Transactional
    public LessonResponse updateLesson(
        Long id,
        LessonRequest request,
        org.springframework.web.multipart.MultipartFile file
    ) {
        validate(request);
        Lesson lesson = lessonRepository
            .findById(id)
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Lesson not found with id: " + id)
            );
        Lesson.SkillType skill =
            request.skillType() == null ? lesson.getSkillType() : request.skillType();
        if (
            lessonRepository.existsByChapterIdAndSkillTypeAndDisplayOrderAndIdNot(
                lesson.getChapter().getId(),
                skill,
                request.displayOrder(),
                id
            )
        ) {
            throw duplicateOrder(request.displayOrder());
        }
        lesson.setSkillType(skill);
        lesson.setLessonNo(request.lessonNo());
        lesson.setTitle(request.title());
        lesson.setDescription(request.description());
        if (skill == Lesson.SkillType.KANJI && kanjiService != null) {
            if (request.documents() != null || file != null) {
                lesson.setDocuments(
                    kanjiService.documents(
                        request.documents() != null ? request.documents() : lesson.getDocuments(),
                        file
                    )
                );
            }
        } else if (skill == Lesson.SkillType.VOCABULARY) {
            lesson.setDocuments(vocabularyDocuments(request.documents(), lesson.getDocuments(), null));
        } else if (file != null) {
            lesson.setDocuments(uploadDocument(file, lesson.getDocuments()));
        }
        lesson.setDisplayOrder(request.displayOrder());
        if (request.status() != null) lesson.setStatus(request.status());
        return mapToResponse(lessonRepository.save(lesson));
    }

    @Transactional
    public void deleteLesson(Long id) {
        if (!lessonRepository.existsById(id)) throw new ResponseStatusException(
            HttpStatus.NOT_FOUND
        );
        try {
            List<String> vocabularyPdfIds = lessonRepository.findById(id)
                .filter(lesson -> lesson.getSkillType() == Lesson.SkillType.VOCABULARY)
                .map(lesson -> vocabularyPdfIds(lesson.getDocuments()))
                .orElseGet(List::of);
            lessonRepository.deleteById(id);
            lessonRepository.flush();
            if (!vocabularyPdfIds.isEmpty()) {
                TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            vocabularyPdfIds.forEach(LessonService.this::cleanupVocabularyPdf);
                        }
                    }
                );
            }
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Không thể xóa bài học vì đang có dữ liệu liên kết (từ vựng, bài kiểm tra hoặc lịch sử học tập).",
                exception
            );
        }
    }

    private String vocabularyDocuments(String requested, String previous, MultipartFile file) {
        if (requested == null && file == null) return null;

        Map<String, String> managedIdsByUrl = new HashMap<>();
        for (JsonNode entry : documentEntries(previous)) {
            String publicId = entry.path("publicId").asText("");
            String url = entry.path("url").asText("");
            if (!publicId.isBlank() && !url.isBlank()) managedIdsByUrl.put(url, publicId);
        }

        ArrayNode documents = documentEntries(requested);
        for (JsonNode entry : documents) {
            if (entry instanceof ObjectNode document) {
                // Only metadata stored by the server can authorize deleting an asset.
                document.remove("publicId");
                String publicId = managedIdsByUrl.get(document.path("url").asText());
                if (publicId != null) document.put("publicId", publicId);
            }
        }

        if (file != null) {
            String filename = file.getOriginalFilename();
            if (file.isEmpty() || filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
                throw new IllegalArgumentException("Vui lòng chọn tệp PDF có dữ liệu.");
            }
            var uploaded = cloudinary.uploadDocument(file);
            String publicId = uploaded.get("publicId");
            TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status == STATUS_ROLLED_BACK) cleanupVocabularyPdf(publicId);
                    }
                }
            );
            documents.add(mapper.valueToTree(uploaded));
        }
        return documents.toString();
    }

    private ArrayNode documentEntries(String documents) {
        ArrayNode entries = mapper.createArrayNode();
        if (documents == null || documents.isBlank()) return entries;
        try {
            JsonNode parsed = mapper.readTree(documents);
            if (parsed instanceof ArrayNode array) return array;
            if (parsed != null && !parsed.isNull()) entries.add(parsed);
        } catch (JsonProcessingException exception) {
            entries.add(documents.trim());
        }
        return entries;
    }

    private List<String> vocabularyPdfIds(String documents) {
        List<String> publicIds = new ArrayList<>();
        for (JsonNode entry : documentEntries(documents)) {
            String publicId = entry.path("publicId").asText("");
            if (!publicId.isBlank() && !publicIds.contains(publicId)) publicIds.add(publicId);
        }
        return publicIds;
    }

    private void cleanupVocabularyPdf(String publicId) {
        try {
            cloudinary.deleteVocabularyPdf(publicId);
        } catch (RuntimeException exception) {
            org.slf4j.LoggerFactory.getLogger(LessonService.class).warn(
                "Không thể xóa PDF bài học từ vựng {}",
                publicId,
                exception
            );
        }
    }

    private String uploadDocument(
        org.springframework.web.multipart.MultipartFile file,
        String previous
    ) {
        String previousId = null;
        try {
            if (previous != null) previousId = mapper
                .readTree(previous)
                .path("publicId")
                .asText(null);
        } catch (Exception ignored) {
            /* Legacy document text has no managed Cloudinary asset. */
        }
        final String oldId = previousId;
        var uploaded = cloudinary.uploadDocument(file);
        String newId = uploaded.get("publicId");
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
            new org.springframework.transaction.support.TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    if (oldId != null && !oldId.equals(newId)) cleanupDocument(oldId);
                }

                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) cleanupDocument(newId);
                }
            }
        );
        try {
            return mapper.writeValueAsString(uploaded);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Không thể lưu thông tin tài liệu", exception);
        }
    }

    private void cleanupDocument(String id) {
        try {
            cloudinary.deleteDocument(id);
        } catch (RuntimeException exception) {
            org.slf4j.LoggerFactory.getLogger(LessonService.class).warn(
                "Không thể xóa tài liệu {}",
                id,
                exception
            );
        }
    }

    private void validate(LessonRequest request) {
        if (request == null) throw new IllegalArgumentException("Dữ liệu bài học là bắt buộc");
        validator
            .validate(request)
            .stream()
            .sorted(Comparator.comparing(v -> v.getPropertyPath().toString()))
            .findFirst()
            .ifPresent(v -> {
                throw new IllegalArgumentException(v.getMessage());
            });
    }

    private ResponseStatusException duplicateOrder(Integer order) {
        return new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Thứ tự hiển thị " + order + " đã được sử dụng trong phần này."
        );
    }

    private LessonResponse mapToResponse(Lesson lesson) {
        return new LessonResponse(
            lesson.getId(),
            lesson.getChapter() == null ? null : lesson.getChapter().getId(),
            lesson.getSkillType(),
            lesson.getLessonNo(),
            lesson.getTitle(),
            lesson.getDescription(),
            lesson.getDocuments(),
            lesson.getDisplayOrder(),
            lesson.getStatus(),
            lesson.getCreatedAt(),
            lesson.getUpdatedAt()
        );
    }
}
