package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.cloudinary.Cloudinary;
import com.jtech.dto.request.*;
import com.jtech.dto.response.*;
import com.jtech.entity.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.security.Principal;
import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class KanjiChapterService {
    private final EntityManager em;
    private final KanjiService kanji;
    private final KanjiExerciseService exercises;
    private final FeedbackService access;
    private final ObjectMapper mapper;
    private final Cloudinary cloudinary;

    public record DocumentItem(long lessonId, String name, String url, String publicId,
        Course.Status status, long exerciseCount, boolean sharedLesson) {}
    public record Content(long chapterId, int chapterNo, String title, Course.Status status, String documents,
        List<DocumentItem> documentItems, long unassignedExerciseCount) {}
    public record DocumentDeletion(Content content, List<String> warnings) {}
    public record PreparedDocument(Content content, long lessonId) {}

    private ArrayNode documentEntries(String raw) {
        var entries = mapper.createArrayNode();
        if (raw == null || raw.isBlank()) return entries;
        try {
            JsonNode value = mapper.readTree(raw);
            if (value.isArray()) entries.addAll((ArrayNode) value);
            else entries.add(value);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            entries.addObject().put("name", "Tài liệu tham khảo").put("url", raw);
        }
        return entries;
    }

    private String documentUrl(JsonNode document) {
        return document.isTextual() ? document.asText() : document.path("url").asText();
    }

    private List<JsonNode> validDocuments(Lesson lesson) {
        List<JsonNode> documents = new ArrayList<>();
        for (JsonNode entry : documentEntries(lesson.getDocuments())) {
            if (documentUrl(entry).matches("https?://[^\\s]+")) documents.add(entry);
        }
        return documents;
    }

    private String documentName(JsonNode document) {
        String name = document.path("name").asText();
        return name.isBlank() ? "Tài liệu Kanji" : name;
    }

    private Chapter chapter(Principal principal, long id, boolean write) {
        access.actor(principal, "MODERATOR");
        Chapter chapter = write ? em.find(Chapter.class, id, LockModeType.PESSIMISTIC_WRITE) : em.find(Chapter.class, id);
        if (chapter == null || chapter.getCourse() == null || chapter.getCourse().getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chương.");
        }
        if (write && (chapter.getStatus() == Course.Status.ARCHIVED || chapter.getCourse().getStatus() == Course.Status.ARCHIVED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Không thể thay đổi chương đã lưu trữ.");
        }
        return chapter;
    }

    private List<Lesson> lessons(long chapterId) {
        return em.createQuery("SELECT l FROM Lesson l WHERE l.chapter.id=:chapter AND l.skillType=:skill ORDER BY l.displayOrder,l.lessonNo,l.id", Lesson.class)
            .setParameter("chapter", chapterId).setParameter("skill", Lesson.SkillType.KANJI).getResultList();
    }

    private Lesson storage(Chapter chapter) {
        var lessons = lessons(chapter.getId());
        var existing = lessons.stream().filter(l -> l.getStatus() == Course.Status.PUBLISHED && validDocuments(l).isEmpty()).findFirst();
        if (existing.isPresent()) {
            Lesson lesson = existing.get();
            em.lock(lesson, LockModeType.PESSIMISTIC_WRITE);
            em.refresh(lesson);
            if (lesson.getStatus() != Course.Status.PUBLISHED || !validDocuments(lesson).isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Trạng thái nội dung vừa thay đổi. Vui lòng thử lại.");
            }
            return lesson;
        }
        return createStorage(chapter, "Kanji chương " + chapter.getChapterNo(), Course.Status.PUBLISHED);
    }

    private Lesson createStorage(Chapter chapter, String title, Course.Status status) {
        var lessons = lessons(chapter.getId());
        int order = Math.addExact(lessons.stream().mapToInt(Lesson::getDisplayOrder).max().orElse(0), 1);
        int number = lessons.stream().mapToInt(Lesson::getLessonNo).max().orElse(0) + 1;
        if (number > 65535) throw new ResponseStatusException(HttpStatus.CONFLICT, "Chương đã đạt giới hạn lưu trữ nội dung Kanji.");
        Lesson lesson = Lesson.builder().chapter(chapter).skillType(Lesson.SkillType.KANJI)
            .lessonNo(number).displayOrder(order).title(title.substring(0, Math.min(200, title.length())))
            .description("Nội dung Kanji của chương " + chapter.getChapterNo()).status(status).build();
        em.persist(lesson);
        em.flush();
        return lesson;
    }

    public Content content(Principal principal, long chapterId) {
        Chapter chapter = chapter(principal, chapterId, false);
        var documents = mapper.createArrayNode();
        var counts = em.createQuery("SELECT q.lessonId,COUNT(q) FROM Question q WHERE q.skill=:skill AND q.isExerciseQuestion=true AND q.status=:status AND q.lessonId IN (SELECT l.id FROM Lesson l WHERE l.chapter.id=:chapter AND l.skillType=:lessonSkill) GROUP BY q.lessonId", Object[].class)
            .setParameter("skill", Question.Skill.KANJI).setParameter("status", Question.QuestionStatus.ACTIVE)
            .setParameter("chapter", chapterId).setParameter("lessonSkill", Lesson.SkillType.KANJI).getResultList();
        Map<Long, Long> exerciseCounts = new LinkedHashMap<>();
        for (Object[] row : counts) exerciseCounts.put((Long) row[0], (Long) row[1]);
        List<DocumentItem> items = new ArrayList<>();
        long unassigned = 0;
        for (Lesson lesson : lessons(chapterId)) {
            documents.addAll(documentEntries(lesson.getDocuments()));
            var entries = validDocuments(lesson);
            long count = exerciseCounts.getOrDefault(lesson.getId(), 0L);
            if (entries.size() != 1 && lesson.getStatus() != Course.Status.ARCHIVED) unassigned += count;
            for (JsonNode entry : entries) {
                items.add(new DocumentItem(lesson.getId(), documentName(entry), documentUrl(entry), entry.path("publicId").asText(),
                    lesson.getStatus(), entries.size() == 1 ? count : 0, entries.size() > 1));
            }
        }
        Course.Status status = chapter.getCourse().getStatus() == Course.Status.ARCHIVED ? Course.Status.ARCHIVED : chapter.getStatus();
        return new Content(chapterId, chapter.getChapterNo(), chapter.getTitle(), status, documents.toString(), items, unassigned);
    }

    @Transactional
    public Content upload(Principal principal, long chapterId, MultipartFile file) {
        return upload(principal, chapterId, file, null);
    }

    private String validateDocumentName(String value) {
        String name = value == null ? "" : value.trim();
        if (name.isEmpty() || name.length() > 200 || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tài liệu phải có từ 1 đến 200 ký tự hợp lệ.");
        }
        return name;
    }

    @Transactional
    public Content upload(Principal principal, long chapterId, MultipartFile file, String requestedName) {
        Chapter chapter = chapter(principal, chapterId, true);
        kanji.validateDocument(file);
        String originalName = file.getOriginalFilename() == null ? "Tài liệu Kanji" : file.getOriginalFilename().replace('\\', '/');
        originalName = originalName.substring(originalName.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
        String name = requestedName == null ? originalName : validateDocumentName(requestedName);
        if (name.isBlank()) name = "Tài liệu Kanji";
        Lesson lesson = createStorage(chapter, name, Course.Status.PUBLISHED);
        var documents = documentEntries(kanji.documents(null, file));
        ((com.fasterxml.jackson.databind.node.ObjectNode) documents.get(0)).put("name", name);
        lesson.setDocuments(documents.toString());
        em.flush();
        return content(principal, chapterId);
    }

    @Transactional
    public Content renameDocument(Principal p, long chapterId, long lessonId, String url, String requestedName) {
        String name = validateDocumentName(requestedName);
        Lesson lesson = documentLesson(p, chapterId, lessonId, true);
        var entries = documentEntries(lesson.getDocuments());
        boolean found = false;
        for (int index = 0; index < entries.size(); index++) {
            JsonNode entry = entries.get(index);
            if (!url.equals(documentUrl(entry))) continue;
            var document = entry.isObject() ? (com.fasterxml.jackson.databind.node.ObjectNode) entry
                : mapper.createObjectNode().put("url", url);
            document.put("name", name);
            entries.set(index, document);
            found = true;
        }
        if (!found) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tài liệu đã bị xóa hoặc không thuộc mục đã chọn.");
        lesson.setDocuments(entries.toString());
        if (validDocuments(lesson).size() == 1) lesson.setTitle(name);
        em.flush();
        return content(p, chapterId);
    }

    private Lesson documentLesson(Principal p, long chapterId, long lessonId, boolean write) {
        chapter(p, chapterId, write);
        Lesson lesson = write ? em.find(Lesson.class, lessonId, LockModeType.PESSIMISTIC_WRITE) : em.find(Lesson.class, lessonId);
        if (lesson == null || !lesson.getChapter().getId().equals(chapterId) || lesson.getSkillType() != Lesson.SkillType.KANJI) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu trong chương.");
        }
        if (write) em.refresh(lesson);
        if (write && lesson.getStatus() == Course.Status.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tài liệu đã được lưu trữ.");
        }
        return lesson;
    }

    private Lesson singleDocument(Principal p, long chapterId, long lessonId, boolean write) {
        Lesson lesson = documentLesson(p, chapterId, lessonId, write);
        if (validDocuments(lesson).size() != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vui lòng mở bộ bài tập từ đúng tài liệu.");
        }
        return lesson;
    }

    @Transactional
    public PreparedDocument prepareDocument(Principal p, long chapterId, long lessonId, String url) {
        Chapter chapter = chapter(p, chapterId, true);
        Lesson source = documentLesson(p, chapterId, lessonId, true);
        var entries = validDocuments(source);
        if (entries.stream().noneMatch(entry -> url.equals(documentUrl(entry)))) {
            var matches = lessons(chapterId).stream().filter(lesson -> validDocuments(lesson).size() == 1
                && url.equals(documentUrl(validDocuments(lesson).getFirst()))).toList();
            if (matches.size() == 1) return new PreparedDocument(content(p, chapterId), matches.getFirst().getId());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tài liệu đã thay đổi. Vui lòng tải lại.");
        }
        if (entries.size() == 1) return new PreparedDocument(content(p, chapterId), source.getId());
        long selectedId = 0;
        // Legacy questions stay on their source until a moderator assigns them.
        for (JsonNode entry : entries) {
            Lesson target = createStorage(chapter, documentName(entry), source.getStatus());
            target.setDocuments(mapper.createArrayNode().add(entry).toString());
            if (url.equals(documentUrl(entry))) selectedId = target.getId();
        }
        var remaining = mapper.createArrayNode();
        for (JsonNode entry : documentEntries(source.getDocuments())) {
            if (!entries.contains(entry)) remaining.add(entry);
        }
        source.setDocuments(remaining.isEmpty() ? null : remaining.toString());
        em.flush();
        return new PreparedDocument(content(p, chapterId), selectedId);
    }

    @Transactional
    public DocumentDeletion deleteDocument(Principal principal, long chapterId, String url) {
        return deleteDocument(principal, chapterId, null, url, false);
    }

    @Transactional
    public DocumentDeletion deleteDocument(Principal principal, long chapterId, Long lessonId, String url, boolean archiveExercises) {
        chapter(principal, chapterId, true);
        var matches = content(principal, chapterId).documentItems().stream()
            .filter(item -> url.equals(item.url()) && (lessonId == null || item.lessonId() == lessonId)).toList();
        if (matches.size() > 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Vui lòng chọn đúng tài liệu cần xóa.");
        if (matches.isEmpty()) return new DocumentDeletion(content(principal, chapterId), List.of());
        DocumentItem match = matches.getFirst();
        long targetId = match.sharedLesson() ? prepareDocument(principal, chapterId, match.lessonId(), url).lessonId() : match.lessonId();
        Map<String, String> removedFiles = new LinkedHashMap<>();
        for (Lesson lesson : lessons(chapterId)) {
            if (!lesson.getId().equals(targetId)) continue;
            em.lock(lesson, LockModeType.PESSIMISTIC_WRITE);
            em.refresh(lesson);
            var questions = em.createQuery("SELECT q FROM Question q WHERE q.lessonId=:lesson AND q.skill=:skill AND q.isExerciseQuestion=true AND q.status=:status", Question.class)
                .setParameter("lesson", lesson.getId()).setParameter("skill", Question.Skill.KANJI)
                .setParameter("status", Question.QuestionStatus.ACTIVE).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
            if (!questions.isEmpty() && !archiveExercises) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Tài liệu có bài tập. Vui lòng xác nhận lưu trữ các câu hỏi khi xóa.");
            }
            long actor = access.actor(principal, "MODERATOR").getUserId();
            for (Question question : questions) {
                question.setStatus(Question.QuestionStatus.ARCHIVED);
                question.setUpdatedBy(actor);
                question.setUpdatedAt(java.time.LocalDateTime.now());
            }
            ArrayNode entries = documentEntries(lesson.getDocuments());
            ArrayNode remaining = mapper.createArrayNode();
            for (JsonNode document : entries) {
                if (!url.equals(documentUrl(document))) {
                    remaining.add(document);
                    continue;
                }
                if (lesson.getStatus() == Course.Status.ARCHIVED) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Tài liệu thuộc nội dung đã lưu trữ.");
                }
                String publicId = document.path("publicId").asText();
                if (publicId.startsWith("kanji/documents/") || publicId.startsWith(KanjiService.DOCUMENT_FOLDER + "/")) {
                    removedFiles.put(publicId, url);
                }
            }
            if (entries.size() != remaining.size()) {
                lesson.setDocuments(remaining.isEmpty() ? null : remaining.toString());
            }
        }
        em.flush();
        // A file can also be linked from another lesson. Keep files still in use.
        var storedDocuments = em.createQuery("SELECT l.documents FROM Lesson l WHERE l.documents IS NOT NULL", String.class).getResultList();
        for (String raw : storedDocuments) {
            for (JsonNode document : documentEntries(raw)) {
                String publicId = document.path("publicId").asText();
                removedFiles.remove(publicId);
                removedFiles.values().removeIf(value -> value.equals(documentUrl(document)));
            }
        }
        List<String> warnings = new ArrayList<>();
        if (!removedFiles.isEmpty()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    for (String publicId : removedFiles.keySet()) {
                        try {
                            var result = cloudinary.uploader().destroy(publicId, Map.of("resource_type", "raw", "invalidate", true));
                            if (!List.of("ok", "not found").contains(String.valueOf(result.get("result")))) {
                                throw new IllegalStateException("Cloudinary could not delete the document");
                            }
                        } catch (Exception e) {
                            org.slf4j.LoggerFactory.getLogger(KanjiChapterService.class).warn("Could not delete Kanji document {}", publicId, e);
                            warnings.add("Đã gỡ tài liệu khỏi chương nhưng chưa xóa được tệp trên Cloudinary.");
                        }
                    }
                }
            });
        }
        // The callback fills warnings after commit, before the response is serialized.
        return new DocumentDeletion(content(principal, chapterId), warnings);
    }

    private PageRequest page(int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phân trang không hợp lệ.");
        }
        return PageRequest.of(page, size);
    }

    public Page<KanjiDetailResponse> cards(Principal principal, long chapterId, String search, Kanji.Status status, int page, int size) {
        chapter(principal, chapterId, false);
        var paging = page(page, size);
        if (search != null && search.length() > 255) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Từ khóa quá dài.");
        String term = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String where = " FROM Kanji k WHERE k.lesson.chapter.id=:chapter AND k.lesson.skillType=:skill"
            + (status == null ? "" : " AND k.status=:status")
            + (term.isEmpty() ? "" : " AND (LOCATE(:term,LOWER(k.characterText))>0 OR LOCATE(:term,LOWER(k.meaningVi))>0 OR LOCATE(:term,LOWER(k.sinoVietnamese))>0)");
        var query = em.createQuery("SELECT k.id" + where + " ORDER BY k.lesson.displayOrder,k.displayOrder,k.id", Long.class);
        var count = em.createQuery("SELECT COUNT(k)" + where, Long.class);
        for (var q : List.of(query, count)) {
            q.setParameter("chapter", chapterId).setParameter("skill", Lesson.SkillType.KANJI);
            if (status != null) q.setParameter("status", status);
            if (!term.isEmpty()) q.setParameter("term", term);
        }
        var rows = query.setFirstResult((int) paging.getOffset()).setMaxResults(size).getResultList().stream().map(kanji::getDetail).toList();
        return new PageImpl<>(rows, paging, count.getSingleResult());
    }

    private Kanji card(Principal principal, long chapterId, long id, boolean write) {
        chapter(principal, chapterId, write);
        Kanji card = em.find(Kanji.class, id);
        if (card == null || !card.getLesson().getChapter().getId().equals(chapterId) || card.getLesson().getSkillType() != Lesson.SkillType.KANJI) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy flashcard trong chương.");
        }
        if (write && card.getLesson().getStatus() == Course.Status.ARCHIVED) throw new ResponseStatusException(HttpStatus.CONFLICT, "Nội dung đã được lưu trữ.");
        return card;
    }

    public KanjiDetailResponse card(Principal p, long chapterId, long id) {
        card(p, chapterId, id, false);
        return kanji.getDetail(id);
    }

    @Transactional
    public KanjiDetailResponse createCard(Principal p, long chapterId, KanjiCreateRequest request, MultipartFile image) {
        Lesson lesson = storage(chapter(p, chapterId, true));
        return kanji.create(access.actor(p, "MODERATOR").getUserId(), lesson.getId(), request, image);
    }

    @Transactional
    public KanjiDetailResponse updateCard(Principal p, long chapterId, long id, KanjiUpdateRequest request, MultipartFile image) {
        card(p, chapterId, id, true);
        return kanji.update(access.actor(p, "MODERATOR").getUserId(), id, request, image);
    }

    @Transactional
    public boolean deleteCard(Principal p, long chapterId, long id) {
        card(p, chapterId, id, true);
        return kanji.deleteOrArchive(access.actor(p, "MODERATOR").getUserId(), id);
    }

    private Question question(Principal p, long chapterId, long id, boolean write) {
        chapter(p, chapterId, write);
        Question question = em.find(Question.class, id);
        Lesson lesson = question == null || question.getLessonId() == null ? null : em.find(Lesson.class, question.getLessonId());
        if (lesson == null || !lesson.getChapter().getId().equals(chapterId) || lesson.getSkillType() != Lesson.SkillType.KANJI
            || question.getSkill() != Question.Skill.KANJI || !Boolean.TRUE.equals(question.getIsExerciseQuestion())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập trong chương.");
        }
        return question;
    }

    public Page<KanjiExerciseResponse> exercises(Principal p, long chapterId, Question.QuestionStatus status, int page, int size) {
        return exercises(p, chapterId, status, page, size, null, false);
    }

    public Page<KanjiExerciseResponse> exercises(Principal p, long chapterId, Question.QuestionStatus status, int page, int size,
        Long documentLessonId, boolean unassigned) {
        chapter(p, chapterId, false);
        var paging = page(page, size);
        if (documentLessonId != null) {
            singleDocument(p, chapterId, documentLessonId, false);
            return exercises.list(p, documentLessonId, status, page, size);
        }
        var sources = lessons(chapterId).stream().filter(lesson -> validDocuments(lesson).size() != 1
            && lesson.getStatus() != Course.Status.ARCHIVED).map(Lesson::getId).toList();
        if (unassigned && sources.isEmpty()) return Page.empty(paging);
        String where = " FROM Question q WHERE q.skill=:skill AND q.isExerciseQuestion=true AND q.lessonId IN (SELECT l.id FROM Lesson l WHERE l.chapter.id=:chapter AND l.skillType=:lessonSkill)"
            + (status == null ? "" : " AND q.status=:status") + (unassigned ? " AND q.lessonId IN :sources" : "");
        var query = em.createQuery("SELECT q" + where + " ORDER BY q.displayOrder,q.id", Question.class);
        var count = em.createQuery("SELECT COUNT(q)" + where, Long.class);
        for (var q : List.of(query, count)) {
            q.setParameter("skill", Question.Skill.KANJI).setParameter("chapter", chapterId).setParameter("lessonSkill", Lesson.SkillType.KANJI);
            if (status != null) q.setParameter("status", status);
            if (unassigned) q.setParameter("sources", sources);
        }
        var rows = query.setFirstResult((int) paging.getOffset()).setMaxResults(size).getResultList().stream()
            .map(q -> exercises.detail(p, q.getLessonId(), q.getId())).toList();
        return new PageImpl<>(rows, paging, count.getSingleResult());
    }

    public KanjiExerciseResponse exercise(Principal p, long chapterId, long id) {
        return exercise(p, chapterId, id, null);
    }

    public KanjiExerciseResponse exercise(Principal p, long chapterId, long id, Long documentLessonId) {
        Question question = question(p, chapterId, id, false);
        if (documentLessonId != null) {
            singleDocument(p, chapterId, documentLessonId, false);
            if (!question.getLessonId().equals(documentLessonId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Câu hỏi không thuộc tài liệu này.");
        }
        return exercises.detail(p, question.getLessonId(), id);
    }

    @Transactional
    public KanjiExerciseResponse saveExercise(Principal p, long chapterId, Long id, KanjiExerciseRequest request) {
        return saveExercise(p, chapterId, id, request, null);
    }

    @Transactional
    public KanjiExerciseResponse saveExercise(Principal p, long chapterId, Long id, KanjiExerciseRequest request, Long documentLessonId) {
        chapter(p, chapterId, true);
        long lessonId;
        if (documentLessonId != null) {
            lessonId = singleDocument(p, chapterId, documentLessonId, true).getId();
            if (id != null && !question(p, chapterId, id, true).getLessonId().equals(lessonId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Câu hỏi không thuộc tài liệu này.");
            }
        } else {
            lessonId = id == null ? storage(chapter(p, chapterId, true)).getId() : question(p, chapterId, id, true).getLessonId();
        }
        return exercises.save(p, lessonId, id, request);
    }

    @Transactional
    public String deleteExercise(Principal p, long chapterId, long id) {
        return deleteExercise(p, chapterId, id, null);
    }

    @Transactional
    public String deleteExercise(Principal p, long chapterId, long id, Long documentLessonId) {
        Question question = question(p, chapterId, id, true);
        if (documentLessonId != null) {
            singleDocument(p, chapterId, documentLessonId, true);
            if (!question.getLessonId().equals(documentLessonId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Câu hỏi không thuộc tài liệu này.");
        }
        return exercises.delete(p, question.getLessonId(), id);
    }

    @Transactional
    public KanjiExerciseResponse assignExercise(Principal p, long chapterId, long id, long targetLessonId) {
        Lesson target = singleDocument(p, chapterId, targetLessonId, true);
        Question question = question(p, chapterId, id, true);
        Lesson source = documentLesson(p, chapterId, question.getLessonId(), true);
        em.refresh(question, LockModeType.PESSIMISTIC_WRITE);
        if (validDocuments(source).size() == 1 || question.getStatus() != Question.QuestionStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Câu hỏi đã được gán hoặc đã lưu trữ. Vui lòng tải lại.");
        }
        var old = exercises.detail(p, source.getId(), id);
        var request = new KanjiExerciseRequest(old.questionType(), old.content(), old.explanation(), old.difficulty(),
            old.displayOrder(), old.options(), old.correctAnswer(), old.matches());
        var assigned = exercises.save(p, target.getId(), null, request);
        exercises.delete(p, source.getId(), id);
        return assigned;
    }
}
