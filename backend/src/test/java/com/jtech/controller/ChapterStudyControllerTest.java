package com.jtech.controller;

import com.jtech.entity.*;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChapterStudyControllerTest {
    private final ChapterRepository chapters = mock(ChapterRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final ChapterStudyController controller = new ChapterStudyController(chapters, lessons);
    private Chapter chapter;
    private Course course;

    @BeforeEach void setup() {
        course = new Course(); course.setId(1L); course.setName("Nhật 1"); course.setStatus(Course.Status.PUBLISHED);
        chapter = new Chapter(); chapter.setId(2L); chapter.setChapterNo(1); chapter.setTitle("Chương 1");
        chapter.setCourse(course); chapter.setStatus(Course.Status.PUBLISHED);
        when(chapters.findByIdAndCourseId(2L, 1L)).thenReturn(Optional.of(chapter));
    }
    @Test void opensPublishedChapterAndLoadsOnlyPublishedLessons() {
        var lesson = Lesson.builder().id(3L).chapter(chapter).lessonNo(1).skillType(Lesson.SkillType.VOCABULARY)
            .title("Từ vựng 1").status(Course.Status.PUBLISHED).build();
        when(lessons.findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(2L, Course.Status.PUBLISHED)).thenReturn(List.of(lesson));
        var result = controller.get(1L, 2L);
        assertEquals("Nhật 1", result.courseName());
        assertEquals("Từ vựng 1", result.lessons().getFirst().title());
        assertEquals(2L, result.lessons().getFirst().chapterId());
    }
    @Test void rejectsChapterBelongingToAnotherCourse() {
        when(chapters.findByIdAndCourseId(2L, 9L)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> controller.get(9L, 2L));
        verifyNoInteractions(lessons);
    }
    @Test void rejectsHiddenChapter() {
        chapter.setStatus(Course.Status.HIDDEN);
        assertThrows(ResponseStatusException.class, () -> controller.get(1L, 2L));
        verifyNoInteractions(lessons);
    }
    @Test void rejectsPublishedChapterUnderUnpublishedCourse() {
        course.setStatus(Course.Status.DRAFT);
        assertThrows(ResponseStatusException.class, () -> controller.get(1L, 2L));
        verifyNoInteractions(lessons);
    }
    @Test void publishedChapterWithoutLessonsStillOpens() {
        when(lessons.findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(2L, Course.Status.PUBLISHED)).thenReturn(List.of());
        assertTrue(controller.get(1L, 2L).lessons().isEmpty());
    }
}
