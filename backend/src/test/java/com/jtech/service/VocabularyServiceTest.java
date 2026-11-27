package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.entity.Course;
import com.jtech.entity.Chapter;
import com.jtech.entity.Lesson;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;

class VocabularyServiceTest {

    @Test
    void visible() {
        var service = new VocabularyService(mock(LessonRepository.class));
        var published = new Vocabulary();
        published.setStatus(Course.Status.PUBLISHED);
        var draft = new Vocabulary();
        draft.setStatus(Course.Status.DRAFT);
        var archived = new Vocabulary();
        archived.setStatus(Course.Status.ARCHIVED);
        var student = new UsernamePasswordAuthenticationToken("student", "",
            List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        var moderator = new UsernamePasswordAuthenticationToken("moderator", "",
            List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));

        assertEquals(List.of(published), service.visible(List.of(draft, published, archived), Course.Status.DRAFT, student));
        assertEquals(List.of(draft), service.visible(List.of(draft, published, archived), Course.Status.DRAFT, moderator));
        assertEquals(3, service.visible(List.of(draft, published, archived), null, moderator).size());
    }

    @Test
    void checkLesson() {
        var lessons = mock(LessonRepository.class);
        var service = new VocabularyService(lessons);
        var course = new Course();
        course.setStatus(Course.Status.PUBLISHED);
        var chapter = new Chapter();
        chapter.setCourse(course);
        chapter.setStatus(Course.Status.PUBLISHED);
        var lesson = new Lesson();
        lesson.setChapter(chapter);
        lesson.setSkillType(Lesson.SkillType.VOCABULARY);
        lesson.setStatus(Course.Status.PUBLISHED);
        when(lessons.findById(1L)).thenReturn(Optional.of(lesson));
        var student = new UsernamePasswordAuthenticationToken("student", "",
            List.of(new SimpleGrantedAuthority("ROLE_STUDENT")));
        var moderator = new UsernamePasswordAuthenticationToken("moderator", "",
            List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));

        assertDoesNotThrow(() -> service.checkLesson(1L, student));
        lesson.setStatus(Course.Status.DRAFT);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        lesson.setStatus(Course.Status.PUBLISHED);
        chapter.setStatus(Course.Status.HIDDEN);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        chapter.setStatus(Course.Status.PUBLISHED);
        course.setStatus(Course.Status.ARCHIVED);
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(1L, student));
        assertDoesNotThrow(() -> service.checkLesson(1L, moderator));
        lesson.setSkillType(Lesson.SkillType.KANJI);
        assertThrows(IllegalArgumentException.class, () -> service.checkLesson(1L, moderator));
        assertThrows(ResponseStatusException.class, () -> service.checkLesson(999L, moderator));
    }

    @Test
    @Tag("unit-test-report")
    void delete() {
        var repository = mock(VocabularyRepository.class);
        var service = new VocabularyService(mock(LessonRepository.class));
        var vocabulary = new Vocabulary();
        vocabulary.setId(10L);
        vocabulary.setLessonId(3L);
        vocabulary.setWord("日本語");
        vocabulary.setReading("にほんご");
        vocabulary.setMeaningVi("Tiếng Nhật");
        vocabulary.setDisplayOrder(0);
        vocabulary.setStatus(Course.Status.PUBLISHED);
        when(repository.findById(10L)).thenReturn(Optional.of(vocabulary));

        service.delete(repository, 10L);

        assertAll(
            () -> assertEquals(Course.Status.ARCHIVED, vocabulary.getStatus()),
            () -> assertEquals(10L, vocabulary.getId()),
            () -> assertEquals(3L, vocabulary.getLessonId()),
            () -> assertEquals("日本語", vocabulary.getWord()),
            () -> assertEquals("にほんご", vocabulary.getReading()),
            () -> assertEquals("Tiếng Nhật", vocabulary.getMeaningVi()),
            () -> assertEquals(0, vocabulary.getDisplayOrder())
        );
        verify(repository).save(vocabulary);

        var missingRepository = mock(VocabularyRepository.class);
        when(missingRepository.findById(999L)).thenReturn(Optional.empty());

        var failure = assertThrows(ResponseStatusException.class, () -> service.delete(missingRepository, 999L));

        assertEquals(HttpStatus.NOT_FOUND, failure.getStatusCode());
        verify(missingRepository, never()).save(any());
    }
}
