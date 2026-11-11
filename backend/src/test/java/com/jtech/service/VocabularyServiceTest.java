package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.entity.*;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

class VocabularyServiceTest {

    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyService service = new VocabularyService(lessons);
    private final Authentication student = auth("ROLE_STUDENT");
    private final Authentication moderator = auth("ROLE_MODERATOR");
    private Chapter chapter;
    private Lesson lesson;

    private static Authentication auth(String role) {
        return new UsernamePasswordAuthenticationToken(
            "user",
            "",
            List.of(new SimpleGrantedAuthority(role))
        );
    }

    @BeforeEach
    void setUp() {
        Course course = new Course();
        course.setStatus(Course.Status.PUBLISHED);
        chapter = new Chapter();
        chapter.setCourse(course);
        chapter.setStatus(Course.Status.PUBLISHED);
        lesson = new Lesson();
        lesson.setChapter(chapter);
        lesson.setSkillType(Lesson.SkillType.VOCABULARY);
        lesson.setStatus(Course.Status.PUBLISHED);
        when(lessons.findById(1L)).thenReturn(Optional.of(lesson));
    }

    @Test
    void studentCannotRequestDraftOrArchivedItemsThroughStatusFilter() {
        Vocabulary published = new Vocabulary();
        published.setStatus(Course.Status.PUBLISHED);
        Vocabulary draft = new Vocabulary();
        draft.setStatus(Course.Status.DRAFT);
        Vocabulary archived = new Vocabulary();
        archived.setStatus(Course.Status.ARCHIVED);
        assertEquals(
            List.of(published),
            service.visible(List.of(draft, published, archived), Course.Status.DRAFT, student)
        );
        assertEquals(
            List.of(draft),
            service.visible(List.of(draft, published, archived), Course.Status.DRAFT, moderator)
        );
        assertEquals(
            3,
            service.visible(List.of(draft, published, archived), null, moderator).size()
        );
    }

    @Test
    void studentCannotAccessPublishedItemsUnderHiddenParents() {
        assertDoesNotThrow(() -> service.checkLesson(1L, student));
        lesson.setStatus(Course.Status.DRAFT);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        lesson.setStatus(Course.Status.PUBLISHED);
        chapter.setStatus(Course.Status.HIDDEN);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        chapter.setStatus(Course.Status.PUBLISHED);
        chapter.getCourse().setStatus(Course.Status.ARCHIVED);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        assertDoesNotThrow(() -> service.checkLesson(1L, moderator));
    }

    @Test
    void rejectsItemsAddedToWrongSkillOrMissingParent() {
        lesson.setSkillType(Lesson.SkillType.KANJI);
        assertThrows(IllegalArgumentException.class, () -> service.checkLesson(1L, moderator));
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(999L, moderator));
    }

    @Test
    @Tag("unit-test-report")
    void deleteArchivesExistingVocabularyAndPreservesContent() {
        var repository = mock(VocabularyRepository.class);
        var item = new Vocabulary();
        item.setId(10L);
        item.setLessonId(3L);
        item.setWord("日本語");
        item.setReading("にほんご");
        item.setMeaningVi("Tiếng Nhật");
        item.setDisplayOrder(0);
        item.setStatus(Course.Status.PUBLISHED);
        when(repository.findById(10L)).thenReturn(Optional.of(item));

        service.delete(repository, 10L);

        assertAll(
            () -> assertEquals(Course.Status.ARCHIVED, item.getStatus()),
            () -> assertEquals(10L, item.getId()),
            () -> assertEquals(3L, item.getLessonId()),
            () -> assertEquals("日本語", item.getWord()),
            () -> assertEquals("にほんご", item.getReading()),
            () -> assertEquals("Tiếng Nhật", item.getMeaningVi()),
            () -> assertEquals(0, item.getDisplayOrder())
        );
        var calls = inOrder(repository);
        calls.verify(repository).findById(10L);
        calls.verify(repository).save(item);
        verifyNoMoreInteractions(repository);
    }

    @Test
    @Tag("unit-test-report")
    void deleteRejectsMissingVocabularyWithoutSaving() {
        var repository = mock(VocabularyRepository.class);
        when(repository.findById(999L)).thenReturn(Optional.empty());

        var failure = assertThrows(
            ResponseStatusException.class, () -> service.delete(repository, 999L)
        );

        assertEquals(HttpStatus.NOT_FOUND, failure.getStatusCode());
        assertEquals("Không tìm thấy từ vựng hoặc bài học.", failure.getReason());
        verify(repository).findById(999L);
        verifyNoMoreInteractions(repository);
    }
}
