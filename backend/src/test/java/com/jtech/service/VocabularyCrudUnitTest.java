package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

class VocabularyCrudUnitTest {

    private record Fixture(VocabularyService service, VocabularyRepository repository, Authentication moderator) {}

    private Fixture fixture() {
        var lessons = mock(LessonRepository.class);
        var repository = mock(VocabularyRepository.class);
        var course = new Course();
        course.setStatus(Course.Status.PUBLISHED);
        var chapter = new Chapter();
        chapter.setCourse(course);
        chapter.setStatus(Course.Status.PUBLISHED);
        var lesson = new Lesson();
        lesson.setSkillType(Lesson.SkillType.VOCABULARY);
        lesson.setStatus(Course.Status.PUBLISHED);
        lesson.setChapter(chapter);
        when(lessons.findById(12L)).thenReturn(Optional.of(lesson));
        var moderator = new UsernamePasswordAuthenticationToken(
            "moderator", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))
        );
        return new Fixture(new VocabularyService(lessons), repository, moderator);
    }

    private VocabularyRequest request(String word, int order) {
        return new VocabularyRequest(word, "reading", "meaning", "noun", "", "", order, Course.Status.DRAFT);
    }

    @Test
    @Tag("unit-test-report")
    void create() {
        var valid = fixture();
        when(valid.repository().save(any())).thenAnswer(call -> call.getArgument(0));

        var created = valid.service().create(valid.repository(), 12L, request("  Japanese  ", 1), valid.moderator());

        assertAll(
            () -> assertEquals(12L, created.getLessonId()),
            () -> assertEquals("Japanese", created.getWord()),
            () -> assertEquals("reading", created.getReading()),
            () -> assertEquals("meaning", created.getMeaningVi()),
            () -> assertEquals(1, created.getDisplayOrder()),
            () -> assertEquals(Course.Status.DRAFT, created.getStatus())
        );
        verify(valid.repository()).save(created);

        var duplicate = fixture();
        when(duplicate.repository().existsByLessonIdAndWordIgnoreCase(12L, "Japanese")).thenReturn(true);

        assertThrows(IllegalStateException.class, () ->
            duplicate.service().create(duplicate.repository(), 12L, request("Japanese", 1), duplicate.moderator())
        );
        verify(duplicate.repository(), never()).save(any());
    }

    @Test
    @Tag("unit-test-report")
    void update() {
        var valid = fixture();
        var vocabulary = new Vocabulary();
        vocabulary.setId(5L);
        vocabulary.setLessonId(12L);
        vocabulary.setWord("Original");
        when(valid.repository().findById(5L)).thenReturn(Optional.of(vocabulary));
        when(valid.repository().save(vocabulary)).thenReturn(vocabulary);

        var updated = valid.service().update(valid.repository(), 12L, 5L, request(" Revised ", 2), valid.moderator());

        assertAll(
            () -> assertEquals(5L, updated.getId()),
            () -> assertEquals(12L, updated.getLessonId()),
            () -> assertEquals("Revised", updated.getWord()),
            () -> assertEquals(2, updated.getDisplayOrder())
        );
        verify(valid.repository()).save(vocabulary);

        var duplicate = fixture();
        var original = new Vocabulary();
        original.setId(5L);
        original.setLessonId(12L);
        original.setWord("Original");
        when(duplicate.repository().findById(5L)).thenReturn(Optional.of(original));
        when(duplicate.repository().existsByLessonIdAndWordIgnoreCaseAndIdNot(12L, "Japanese", 5L)).thenReturn(true);

        assertThrows(IllegalStateException.class, () ->
            duplicate.service().update(duplicate.repository(), 12L, 5L, request("Japanese", 1), duplicate.moderator())
        );
        assertEquals("Original", original.getWord());
        verify(duplicate.repository(), never()).save(any());
    }
}
