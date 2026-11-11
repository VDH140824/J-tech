package com.jtech.service;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VocabularyService {

    private final LessonRepository lessons;

    public VocabularyService(LessonRepository lessons) {
        this.lessons = lessons;
    }

    public boolean isEditor(Authentication authentication) {
        return (
            authentication != null &&
            authentication
                .getAuthorities()
                .stream()
                .anyMatch(a ->
                    Set.of("ROLE_ADMIN", "ADMIN", "ROLE_MODERATOR", "MODERATOR").contains(
                        a.getAuthority()
                    )
                )
        );
    }

    @Transactional
    public void lockLesson(Long id, Authentication authentication) {
        lessons.findForUpdate(id).orElseThrow(this::notFound);
        checkLesson(id, authentication);
    }

    @Transactional(readOnly = true)
    public void checkLesson(Long id, Authentication authentication) {
        Lesson lesson = require(lessons, id);
        if (lesson.getSkillType() != Lesson.SkillType.VOCABULARY) {
            throw new IllegalArgumentException("Từ vựng phải thuộc bài học của kỹ năng từ vựng.");
        }
        if (!isEditor(authentication)) {
            Chapter chapter = lesson.getChapter();
            if (
                lesson.getStatus() != Course.Status.PUBLISHED ||
                chapter.getStatus() != Course.Status.PUBLISHED ||
                chapter.getCourse().getStatus() != Course.Status.PUBLISHED
            ) {
                throw notFound();
            }
        }
    }

    public List<Vocabulary> visible(
        List<Vocabulary> items,
        Course.Status status,
        Authentication authentication
    ) {
        boolean editor = isEditor(authentication);
        return items
            .stream()
            .filter(item ->
                editor
                    ? status == null || item.getStatus() == status
                    : item.getStatus() == Course.Status.PUBLISHED
            )
            .toList();
    }

    public <T> T require(JpaRepository<T, Long> repository, Long id) {
        return repository.findById(id).orElseThrow(this::notFound);
    }

    @Transactional
    public Vocabulary create(
        VocabularyRepository repository,
        Long lessonId,
        VocabularyRequest request,
        Authentication authentication
    ) {
        checkLesson(lessonId, authentication);
        if (repository.existsByLessonIdAndWordIgnoreCase(lessonId, request.word().trim())) {
            throw new IllegalStateException(
                "Từ vựng này đã tồn tại trong bài học. Vui lòng kiểm tra cả nội dung đã lưu trữ."
            );
        }
        Vocabulary item = new Vocabulary();
        item.setLessonId(lessonId);
        apply(item, request);
        return repository.save(item);
    }

    public Vocabulary update(VocabularyRepository repository, Long id, VocabularyRequest request) {
        Vocabulary item = require(repository, id);
        if (
            repository.existsByLessonIdAndWordIgnoreCaseAndIdNot(
                item.getLessonId(),
                request.word().trim(),
                id
            )
        ) {
            throw new IllegalStateException("Từ vựng này đã tồn tại trong bài học.");
        }
        apply(item, request);
        return repository.save(item);
    }

    @Transactional
    public int updateStatuses(
        VocabularyRepository repository,
        Long lessonId,
        List<Long> ids,
        Course.Status status,
        Authentication authentication
    ) {
        checkLesson(lessonId, authentication);
        if (status == Course.Status.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hãy dùng thao tác lưu trữ riêng.");
        }
        Set<Long> uniqueIds = Set.copyOf(ids);
        var items = repository.findForStatusUpdate(lessonId, uniqueIds);
        if (
            items.size() != uniqueIds.size() ||
            items.stream().anyMatch(item -> item.getStatus() == Course.Status.ARCHIVED)
        ) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Một số từ đã lưu trữ hoặc không thuộc bài học này."
            );
        }
        return repository.updateStatuses(lessonId, uniqueIds, status, LocalDateTime.now());
    }

    @Transactional
    public void delete(JpaRepository<Vocabulary, Long> repository, Long id) {
        Vocabulary item = require(repository, id);
        item.setStatus(Course.Status.ARCHIVED);
        repository.save(item);
    }

    private void apply(Vocabulary item, VocabularyRequest request) {
        item.setWord(request.word() == null ? null : request.word().trim());
        item.setReading(request.reading() == null ? null : request.reading().trim());
        item.setMeaningVi(request.meaningVi() == null ? null : request.meaningVi().trim());
        item.setWordType(request.wordType() == null ? null : request.wordType().trim());
        item.setExampleJp(request.exampleJp() == null ? null : request.exampleJp().trim());
        item.setExampleVi(request.exampleVi() == null ? null : request.exampleVi().trim());
        item.setDisplayOrder(request.displayOrder());
        item.setStatus(request.status());
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Không tìm thấy từ vựng hoặc bài học."
        );
    }
}
