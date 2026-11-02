package com.jtech.service;

import com.jtech.dto.request.*;
import com.jtech.dto.response.*;
import com.jtech.entity.*;
import com.jtech.repository.*;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.springframework.jdbc.core.JdbcTemplate;
import javax.imageio.ImageIO;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.ZipInputStream;
import jakarta.persistence.LockModeType;
import jakarta.persistence.EntityManager;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service @RequiredArgsConstructor
public class KanjiService {
    private static final Logger log = LoggerFactory.getLogger(KanjiService.class);
    private final KanjiRepository kanjiRepository;
    private final LessonRepository lessonRepository;
    private final Cloudinary cloudinary;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final EntityManager entityManager;
    private final Validator validator;

    private Lesson lesson(Long id) {
        return lessonRepository.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Lesson not found"));
    }
    private Kanji kanji(Long id) {
        return kanjiRepository.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Kanji not found"));
    }
    private void validate(Object request, String characterText) {
        var violations = validator.validate(request);
        if (!violations.isEmpty()) throw error(HttpStatus.BAD_REQUEST, violations.iterator().next().getMessage());
        String text = characterText.trim();
        if (text.codePointCount(0, text.length()) < 1 || text.codePointCount(0, text.length()) > 5
                || text.codePoints().anyMatch(c -> Character.UnicodeScript.of(c) != Character.UnicodeScript.HAN))
            throw error(HttpStatus.BAD_REQUEST, "Character text must contain 1 to 5 Japanese Kanji characters");
    }
    @Transactional
    public KanjiDetailResponse create(Long actorId, Long lessonId, KanjiCreateRequest request, MultipartFile image) {
        Lesson lesson = lesson(lessonId);
        entityManager.lock(lesson, LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(lesson);
        if (lesson.getStatus() == Course.Status.ARCHIVED) throw error(HttpStatus.NOT_FOUND, "Lesson is archived");
        if (lesson.getSkillType() != Lesson.SkillType.KANJI) throw error(HttpStatus.BAD_REQUEST, "Lesson is not a Kanji lesson");
        validate(request, request.characterText());
        if (kanjiRepository.existsByLessonIdAndCharacterText(lessonId, request.characterText().trim()))
            throw error(HttpStatus.CONFLICT, "Kanji already exists in this lesson");
        Kanji k = new Kanji(); k.setLesson(lesson); k.setCreatedBy(actorId);
        k.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : Math.addExact(kanjiRepository.findMaxDisplayOrder(lessonId), 1));
        k.setStatus(request.status() != null ? request.status() : Kanji.Status.DRAFT);
        apply(k, request.characterText(), request.sinoVietnamese(), request.onyomi(), request.kunyomi(), request.meaningVi(), request.examples(), request.mnemonicStory()); replaceImage(k, false, image);
        kanjiRepository.saveAndFlush(k);
        logAction(actorId, "KANJI_CREATE", "Kanji", k.getId(), "Created Kanji");
        return toResponse(k);
    }
    @Transactional(readOnly = true)
    public Page<KanjiDetailResponse> listByLesson(Long lessonId, String search, Kanji.Status status, Pageable page) {
        lesson(lessonId);
        if (search != null && search.length() > 255) throw error(HttpStatus.BAD_REQUEST, "Từ khóa tìm kiếm không quá 255 ký tự.");
        Specification<Kanji> spec = (root, query, cb) -> cb.equal(root.get("lesson").get("id"), lessonId);
        if (status != null) spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        if (search != null && !search.isBlank()) {
            String value = "%" + search.trim().toLowerCase(java.util.Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("characterText")), value, '\\'),
                    cb.like(cb.lower(root.get("meaningVi")), value, '\\'),
                    cb.like(cb.lower(root.get("sinoVietnamese")), value, '\\')));
        }
        Pageable ordered = PageRequest.of(page.getPageNumber(), Math.min(page.getPageSize(), 100), Sort.by("displayOrder", "id"));
        return kanjiRepository.findAll(spec, ordered).map(this::toResponse);
    }
    @Transactional(readOnly = true)
    public KanjiDetailResponse getDetail(Long id) { return toResponse(kanji(id)); }
    @Transactional
    public KanjiDetailResponse update(Long actorId, Long id, KanjiUpdateRequest request, MultipartFile image) {
        Kanji k = kanji(id);
        entityManager.lock(k.getLesson(), LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(k, LockModeType.PESSIMISTIC_WRITE);
        if (k.getStatus() == Kanji.Status.ARCHIVED) throw error(HttpStatus.CONFLICT, "Archived Kanji cannot be edited");
        validate(request, request.characterText());
        if (kanjiRepository.existsByLessonIdAndCharacterTextAndIdNot(k.getLesson().getId(), request.characterText().trim(), id))
            throw error(HttpStatus.CONFLICT, "Kanji already exists in this lesson");
        if (image != null && request.removeImage()) throw error(HttpStatus.BAD_REQUEST, "Choose replacement or removal of the image");
        apply(k, request.characterText(), request.sinoVietnamese(), request.onyomi(), request.kunyomi(), request.meaningVi(), request.examples(), request.mnemonicStory()); k.setUpdatedBy(actorId);
        k.setDisplayOrder(request.displayOrder()); k.setStatus(request.status());
        replaceImage(k, request.removeImage(), image);
        kanjiRepository.saveAndFlush(k);
        logAction(actorId, "KANJI_UPDATE", "Kanji", id, "Updated Kanji");
        return toResponse(k);
    }
    @Transactional
    public boolean deleteOrArchive(Long actorId, Long id) {
        Kanji k = kanji(id);
        entityManager.lock(k.getLesson(), LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(k, LockModeType.PESSIMISTIC_WRITE);
        if (existsLearningData(id)) {
            k.setStatus(Kanji.Status.ARCHIVED); k.setUpdatedBy(actorId);
            kanjiRepository.saveAndFlush(k);
            logAction(actorId, "KANJI_ARCHIVE", "Kanji", id, "Archived because learning data exists");
            return false;
        }
        kanjiRepository.delete(k); kanjiRepository.flush();
        cleanupAfterCommit(k.getImagePublicId());
        logAction(actorId, "KANJI_DELETE", "Kanji", id, "Deleted Kanji");
        return true;
    }
    private void apply(Kanji k, String characterText, String sinoVietnamese, String onyomi, String kunyomi,
                       String meaningVi, String examples, String mnemonicStory) {
        k.setCharacterText(characterText.trim()); k.setSinoVietnamese(trim(sinoVietnamese));
        k.setOnyomi(trim(onyomi)); k.setKunyomi(trim(kunyomi));
        k.setMeaningVi(meaningVi.trim()); k.setExamples(trim(examples)); k.setMnemonicStory(trim(mnemonicStory));
    }
    private KanjiDetailResponse toResponse(Kanji k) {
        return new KanjiDetailResponse(k.getId(), k.getLesson().getId(), k.getCharacterText(), k.getSinoVietnamese(),
                k.getOnyomi(), k.getKunyomi(), k.getMeaningVi(), k.getExamples(), k.getImageUrl(),
                k.getImagePublicId(), k.getMnemonicStory(), k.getDisplayOrder(), k.getStatus(), k.getCreatedAt(), k.getUpdatedAt());
    }
    private String trim(String value) { return value == null ? null : value.trim(); }
    private void replaceImage(Kanji k, boolean removeImage, MultipartFile image) {
        String oldId = k.getImagePublicId();
        if (image != null) {
            var uploaded = uploadImage(image);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) cleanup(uploaded.publicId());
                }
            });
            k.setImageUrl(uploaded.url()); k.setImagePublicId(uploaded.publicId());
        } else if (removeImage) { k.setImageUrl(null); k.setImagePublicId(null); }
        if (!Objects.equals(oldId, k.getImagePublicId())) cleanupAfterCommit(oldId);
    }
    private void cleanupAfterCommit(String id) {
        if (id == null) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { cleanup(id); }
        });
    }
    private void cleanup(String id) {
        try { deleteImage(id); }
        catch (RuntimeException ex) { log.warn("Could not clean up Kanji image {}", id, ex); }
    }
    private ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }

    private boolean existsLearningData(Long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM flashcard_progress WHERE kanji_id = ?)
                OR EXISTS(SELECT 1 FROM learning_item_progress WHERE kanji_id = ?)
                OR EXISTS(SELECT 1 FROM study_session WHERE kanji_id = ?)
            """, Boolean.class, id, id, id));
    }

    private void logAction(Long actorId, String action, String entityType, Long entityId, String detail) {
        jdbc.update("INSERT INTO audit_log(user_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, JSON_OBJECT('message', ?))",
                actorId, action, entityType, entityId, detail);
    }

    private record MediaResult(String url, String publicId) {}
    private MediaResult uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024
                || !Set.of("image/png", "image/jpeg", "image/gif").contains(String.valueOf(file.getContentType()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image must be PNG, JPEG or GIF, up to 5 MB");
        }
        try (var stream = file.getInputStream()) {
            if (ImageIO.read(stream) == null) throw new IOException("Invalid image");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image", e);
        }
        try {
            var result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "kanji", "resource_type", "image", "unique_filename", true, "overwrite", false));
            return new MediaResult((String) result.get("secure_url"), (String) result.get("public_id"));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image upload failed", e);
        }
    }
    private void deleteImage(String publicId) {
        if (publicId == null || publicId.isBlank()) return;
        try {
            var result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "image"));
            if (!Set.of("ok", "not found").contains(String.valueOf(result.get("result"))))
                throw new IllegalStateException("Cloudinary did not delete the image");
        } catch (IOException e) { throw new IllegalStateException("Image deletion failed", e); }
    }

    public String documents(String existing, MultipartFile file) {
        ArrayNode documents = mapper.createArrayNode();
        if (existing != null && !existing.isBlank()) {
            try {
                var parsed = mapper.readTree(existing);
                if (parsed.isArray()) documents.addAll((ArrayNode) parsed);
                else documents.add(parsed);
            } catch (IOException e) {
                String link = existing.trim();
                if (!link.matches("https?://[^\\s]+")) throw bad("Vui lòng nhập đường dẫn tài liệu hợp lệ.");
                documents.addObject().put("name", "Tài liệu tham khảo").put("url", link);
            }
        }
        if (file == null) return documents.isEmpty() ? null : documents.toString();
        validateDocument(file);
        String publicId = "kanji/documents/" + UUID.randomUUID() + extension(file.getOriginalFilename());
        // Register cleanup before the remote request, including a failed/uncertain upload.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try { cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", "raw")); }
                    catch (Exception e) { LoggerFactory.getLogger(KanjiService.class).warn("Could not clean up document {}", publicId, e); }
                }
            }
        });
        try {
            var uploaded = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", "raw", "public_id", publicId, "overwrite", false));
            String url = (String) uploaded.get("secure_url");
            if (url == null || !url.startsWith("https://")) throw new IOException("Missing document URL");
            String name = Optional.ofNullable(file.getOriginalFilename()).orElse("Tài liệu").replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
            documents.addObject().put("name", name).put("url", url).put("publicId", publicId);
            return documents.toString();
        } catch (IOException e) {
            throw bad("Không thể tải tài liệu lên. Vui lòng thử lại.");
        }
    }
    public void validateDocument(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw bad("Tệp phải có dữ liệu và không quá 10 MB.");
        String extension = extension(file.getOriginalFilename());
        try {
            byte[] bytes = file.getBytes();
            boolean valid = switch (extension) {
                case ".pdf" -> new String(bytes, 0, Math.min(5, bytes.length), StandardCharsets.US_ASCII).equals("%PDF-");
                case ".png", ".jpg", ".jpeg" -> ImageIO.read(new ByteArrayInputStream(bytes)) != null;
                case ".txt" -> {
                    String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
                    yield text.codePoints().noneMatch(c -> Character.isISOControl(c) && c != '\n' && c != '\r' && c != '\t');
                }
                case ".docx" -> {
                    boolean content = false, word = false;
                    try (var zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
                        long expanded = 0; int entries = 0;
                        for (var entry = zip.getNextEntry(); entry != null; entry = zip.getNextEntry()) {
                            if (++entries > 2000) throw bad("Tệp tài liệu quá lớn.");
                            content |= entry.getName().equals("[Content_Types].xml");
                            word |= entry.getName().equals("word/document.xml");
                            byte[] buffer = new byte[8192]; int n;
                            while ((n = zip.read(buffer)) != -1) {
                                expanded += n;
                                if (expanded > 50 * 1024 * 1024) throw bad("Tệp tài liệu quá lớn.");
                            }
                        }
                    }
                    yield content && word;
                }
                default -> false;
            };
            if (!valid) throw bad("Chỉ hỗ trợ tài liệu PDF, DOCX, TXT hoặc ảnh PNG, JPG hợp lệ.");
        } catch (IOException e) { throw bad("Không thể đọc tệp đã chọn."); }
    }
    private String extension(String name) {
        if (name == null || name.lastIndexOf('.') < 0) return "";
        return name.substring(name.lastIndexOf('.')).toLowerCase(Locale.ROOT);
    }
    private ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
