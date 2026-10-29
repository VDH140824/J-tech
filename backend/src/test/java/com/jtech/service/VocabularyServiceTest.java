package com.jtech.service;

import com.jtech.entity.*;
import com.jtech.repository.LessonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VocabularyServiceTest {
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyService service = new VocabularyService(lessons);
    private final Authentication student = auth("ROLE_STUDENT");
    private final Authentication moderator = auth("ROLE_MODERATOR");
    private Chapter chapter;
    private Lesson lesson;

    private static Authentication auth(String role) {
        return new UsernamePasswordAuthenticationToken("user", "", List.of(new SimpleGrantedAuthority(role)));
    }
    @BeforeEach void setUp() {
        Course course = new Course(); course.setStatus(Course.Status.PUBLISHED);
        chapter = new Chapter(); chapter.setCourse(course); chapter.setStatus(Course.Status.PUBLISHED);
        lesson = new Lesson(); lesson.setChapter(chapter); lesson.setSkillType(Lesson.SkillType.VOCABULARY); lesson.setStatus(Course.Status.PUBLISHED);
        when(lessons.findById(1L)).thenReturn(Optional.of(lesson));
    }
    @Test void studentCannotRequestDraftOrArchivedItemsThroughStatusFilter() {
        Vocabulary published = new Vocabulary(); published.setStatus(Course.Status.PUBLISHED);
        Vocabulary draft = new Vocabulary(); draft.setStatus(Course.Status.DRAFT);
        Vocabulary archived = new Vocabulary(); archived.setStatus(Course.Status.ARCHIVED);
        assertEquals(List.of(published), service.visible(List.of(draft, published, archived), Course.Status.DRAFT, student));
        assertEquals(List.of(draft), service.visible(List.of(draft, published, archived), Course.Status.DRAFT, moderator));
        assertEquals(3, service.visible(List.of(draft, published, archived), null, moderator).size());
    }
    @Test void studentCannotAccessPublishedItemsUnderHiddenParents() {
        assertDoesNotThrow(() -> service.checkLesson(1L, student));
        lesson.setStatus(Course.Status.DRAFT);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        lesson.setStatus(Course.Status.PUBLISHED); chapter.setStatus(Course.Status.HIDDEN);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        chapter.setStatus(Course.Status.PUBLISHED); chapter.getCourse().setStatus(Course.Status.ARCHIVED);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        assertDoesNotThrow(() -> service.checkLesson(1L, moderator));
    }
    @Test void rejectsItemsAddedToWrongSkillOrMissingParent() {
        lesson.setSkillType(Lesson.SkillType.KANJI);
        assertThrows(IllegalArgumentException.class, () -> service.checkLesson(1L, moderator));
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(999L, moderator));
    }
    @Test void mediaAllowsOnlyAbsoluteHttpUrls() {
        assertDoesNotThrow(() -> service.checkMediaUrl("https://res.cloudinary.com/demo/audio.mp3"));
        assertDoesNotThrow(() -> service.checkMediaUrl(""));
        for (String url : List.of("javascript:alert(1)", "data:text/html,test", "/relative.mp3", "https://")) {
            assertThrows(IllegalArgumentException.class, () -> service.checkMediaUrl(url));
        }
    }
}

