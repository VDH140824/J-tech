package com.jtech.controller;

import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ReadVocabTest {

    private final VocabularyRepository vocabulary = mock(VocabularyRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyService service = new VocabularyService(lessons);
    private final VocabularyController controller = new VocabularyController(vocabulary, service);
    private final Authentication moderator = new UsernamePasswordAuthenticationToken(
            "moderator", "", List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")));
    private Lesson lesson;

    @BeforeEach
    void setUp() {
        var course = new Course();
        course.setId(1L);
        var chapter = new Chapter();
        chapter.setId(2L);
        chapter.setCourse(course);
        lesson = new Lesson();
        lesson.setId(3L);
        lesson.setChapter(chapter);
        lesson.setSkillType(Lesson.SkillType.VOCABULARY);
        when(lessons.findById(3L)).thenReturn(Optional.of(lesson));
    }

    private Vocabulary existing(Course.Status status) {
        var word = new Vocabulary();
        word.setId(10L);
        word.setLessonId(3L);
        word.setWord("日本語");
        word.setReading("にほんご");
        word.setMeaningVi("Tiếng Nhật");
        word.setDisplayOrder(0);
        word.setStatus(status);
        return word;
    }

    @Test
    @DisplayName("Read list within the selected lesson without writes")
    void listReadsSelectedLessonWithoutModifyingRecords() {
        var word = existing(Course.Status.DRAFT);
        when(vocabulary.findByLessonIdOrderByDisplayOrderAscIdAsc(3L)).thenReturn(List.of(word));
        assertEquals(List.of(word), controller.list(3L, null, moderator));
        assertEquals(Course.Status.DRAFT, word.getStatus());
        verify(vocabulary).findByLessonIdOrderByDisplayOrderAscIdAsc(3L);
        verifyNoMoreInteractions(vocabulary);
    }

    @Test
    @DisplayName("Filter by status without writes")
    void filterByStatusWithoutModifyingRecords() {
        var draft = existing(Course.Status.DRAFT);
        var archived = existing(Course.Status.ARCHIVED);
        when(vocabulary.findByLessonIdOrderByDisplayOrderAscIdAsc(3L)).thenReturn(List.of(draft, archived));
        assertEquals(List.of(archived), controller.list(3L, Course.Status.ARCHIVED, moderator));
        assertEquals(Course.Status.DRAFT, draft.getStatus());
        assertEquals(Course.Status.ARCHIVED, archived.getStatus());
        verify(vocabulary).findByLessonIdOrderByDisplayOrderAscIdAsc(3L);
        verifyNoMoreInteractions(vocabulary);
    }

}
