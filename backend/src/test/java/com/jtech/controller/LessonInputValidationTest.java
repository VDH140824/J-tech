package com.jtech.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.dto.request.LessonRequest;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class LessonInputValidationTest {

    // UC-38 / BR-136: both numeric inputs are required and must be at least 1.
    @ParameterizedTest(name = "{0} = {1}, valid = {2}")
    @CsvSource({
        "lessonNo, , false", "lessonNo, -1, false", "lessonNo, 0, false", "lessonNo, 1, true",
        "displayOrder, , false", "displayOrder, -1, false", "displayOrder, 0, false", "displayOrder, 1, true"
    })
    void validateNumericInput(String field, Integer value, boolean valid) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertEquals(valid, factory.getValidator().validateValue(LessonRequest.class, field, value).isEmpty());
        }
    }

    // UC-38 / BR-137: a title is required and may contain at most 200 characters.
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = " ")
    void rejectBlankTitle(String title) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertFalse(factory.getValidator().validateValue(LessonRequest.class, "title", title).isEmpty());
        }
    }

    @ParameterizedTest(name = "Title length {0}, valid = {1}")
    @CsvSource({"200, true", "201, false"})
    void validateTitleLength(int length, boolean valid) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertEquals(valid, factory.getValidator()
                .validateValue(LessonRequest.class, "title", "a".repeat(length)).isEmpty());
        }
    }

    @Test
    void acceptEmptyOptionalInputs() {
        var input = new LessonRequest(Lesson.SkillType.VOCABULARY, 1, "Sample lesson", null, null, 1, null);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(input).isEmpty());
        }
    }

    // UC-38 E1: an unused display order does not make a duplicate lesson number valid.
    @Test
    void rejectDuplicateLessonNumberWithinChapter() {
        var lessons = mock(LessonRepository.class);
        var chapters = mock(ChapterRepository.class);
        var chapter = new Chapter();
        chapter.setId(1L);
        var existing = Lesson.builder().chapter(chapter).skillType(Lesson.SkillType.VOCABULARY)
            .lessonNo(2).displayOrder(1).build();
        when(chapters.findById(1L)).thenReturn(Optional.of(chapter));
        when(lessons.findByChapterIdOrderByDisplayOrderAscLessonNoAscIdAsc(1L)).thenReturn(List.of(existing));
        when(lessons.findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(1L, Lesson.SkillType.VOCABULARY))
            .thenReturn(List.of(existing));
        when(lessons.save(any(Lesson.class))).thenAnswer(call -> call.getArgument(0));
        var input = new LessonRequest(Lesson.SkillType.VOCABULARY, 2, "Sample lesson", null, null, 2, Course.Status.DRAFT);

        var response = new LessonController(lessons, chapters).createLesson(null, 1L, input);

        assertAll(
            () -> assertTrue(response.getStatusCode().is4xxClientError(), "Duplicate lesson number must be rejected"),
            () -> verify(lessons, never()).save(any(Lesson.class))
        );
    }
}
