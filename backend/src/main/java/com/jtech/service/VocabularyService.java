package com.jtech.service;

import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.List;
import java.util.Set;

@Service
public class VocabularyService {
    private final LessonRepository lessons;

    public VocabularyService(LessonRepository lessons) {
        this.lessons = lessons;
    }

    public boolean isEditor(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream().anyMatch(a ->
                Set.of("ROLE_ADMIN", "ADMIN", "ROLE_MODERATOR", "MODERATOR").contains(a.getAuthority()));
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
            if (lesson.getStatus() != Course.Status.PUBLISHED || chapter.getStatus() != Course.Status.PUBLISHED ||
                    chapter.getCourse().getStatus() != Course.Status.PUBLISHED) {
                throw notFound();
            }
        }
    }

    public List<Vocabulary> visible(List<Vocabulary> items, Course.Status status, Authentication authentication) {
        boolean editor = isEditor(authentication);
        return items.stream().filter(item -> editor
                ? (status == null || item.getStatus() == status)
                : item.getStatus() == Course.Status.PUBLISHED).toList();
    }

    public <T> T require(JpaRepository<T, Long> repository, Long id) {
        return repository.findById(id).orElseThrow(this::notFound);
    }

    public void checkMediaUrl(String value) {
        if (value == null || value.isBlank()) return;
        try {
            URI uri = URI.create(value.trim());
            if (!("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme())) || uri.getHost() == null) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Đường dẫn audio phải là URL HTTP hoặc HTTPS hợp lệ.");
        }
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy từ vựng hoặc bài học.");
    }
}
