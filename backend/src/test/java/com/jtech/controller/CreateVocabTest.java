package com.jtech.controller;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.entity.Vocabulary;
import com.jtech.repository.LessonRepository;
import com.jtech.repository.VocabularyRepository;
import com.jtech.service.VocabularyService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CreateVocabTest {
    private static final ValidatorFactory VALIDATORS = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = VALIDATORS.getValidator();

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

    @AfterAll
    static void closeValidatorFactory() {
        VALIDATORS.close();
    }

    private VocabularyRequest input(String word, String reading, String meaning, Integer order) {
        // Null legacy audio fields deliberately model the confirmed synthesis workflow.
        return new VocabularyRequest(word, reading, meaning, null, null, null,
                null, null, order, Course.Status.DRAFT);
    }

    private VocabularyRequest validInput() {
        return input("日本語", "にほんご", "Tiếng Nhật", 0);
    }

    private void assertRequiredFieldViolation(VocabularyRequest request, String field) {
        assertTrue(VALIDATOR.validate(request).stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals(field)),
                () -> "Missing required field: " + field);
    }

    @Test
    @DisplayName("Valid input needs no audio URL")
    void validVocabularyDoesNotRequireAudioUrl() {
        var violations = VALIDATOR.validate(validInput());
        assertTrue(violations.isEmpty(), () -> "Synthesis replaces audio URL: " + violations);
    }

    @Test
    @DisplayName("Create under selected Vocabulary lesson")
    void createBindsWordToSelectedVocabularyLesson() {
        when(vocabulary.save(any(Vocabulary.class))).thenAnswer(call -> call.getArgument(0));
        var created = controller.create(3L, validInput(), moderator).getBody();
        assertNotNull(created);
        assertAll(() -> assertEquals(3L, created.getLessonId()),
                () -> assertEquals("日本語", created.getWord()),
                () -> assertEquals("にほんご", created.getReading()),
                () -> assertEquals("Tiếng Nhật", created.getMeaningVi()),
                () -> assertEquals(0, created.getDisplayOrder()),
                () -> assertEquals(Course.Status.DRAFT, created.getStatus()));
        verify(vocabulary).save(created);
    }

    @Test
    @DisplayName("Save optional fields")
    void createSavesOptionalFields() {
        when(vocabulary.save(any(Vocabulary.class))).thenAnswer(call -> call.getArgument(0));
        var request = new VocabularyRequest("日本語", "にほんご", "Tiếng Nhật", "Noun",
                "日本語を勉強します。", "Tôi học tiếng Nhật.", null, null, 1, Course.Status.DRAFT);
        var created = controller.create(3L, request, moderator).getBody();
        assertNotNull(created);
        assertAll(() -> assertEquals(request.wordType(), created.getWordType()),
                () -> assertEquals(request.exampleJp(), created.getExampleJp()),
                () -> assertEquals(request.exampleVi(), created.getExampleVi()));
    }

    @ParameterizedTest(name = "missing word: [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("Japanese word is required")
    void rejectMissingWord(String value) {
        assertRequiredFieldViolation(input(value, "にほんご", "Tiếng Nhật", 0), "word");
    }

    @ParameterizedTest(name = "missing reading: [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("Reading is required")
    void rejectMissingReading(String value) {
        assertRequiredFieldViolation(input("日本語", value, "Tiếng Nhật", 0), "reading");
    }

    @ParameterizedTest(name = "missing meaning: [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = " ")
    @DisplayName("Vietnamese meaning is required")
    void rejectMissingMeaning(String value) {
        assertRequiredFieldViolation(input("日本語", "にほんご", value, 0), "meaningVi");
    }

    @Test
    @DisplayName("Display order is required")
    void rejectMissingDisplayOrder() {
        assertRequiredFieldViolation(input("日本語", "にほんご", "Tiếng Nhật", null), "displayOrder");
    }

    @Test
    @DisplayName("Negative display order is rejected")
    void rejectNegativeDisplayOrder() {
        assertRequiredFieldViolation(input("日本語", "にほんご", "Tiếng Nhật", -1), "displayOrder");
    }

    @Test
    @DisplayName("Accept zero display order")
    void zeroIsValidForDisplayOrder() {
        assertTrue(VALIDATOR.validateProperty(validInput(), "displayOrder").isEmpty());
    }

    @Test
    @DisplayName("Duplicate create includes archived entries in the lookup")
    void duplicateCreateDoesNotSave() {
        // The lookup has no status restriction. Actual IgnoreCase SQL requires integration testing.
        when(vocabulary.existsByLessonIdAndWordIgnoreCase(3L, "日本語")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> controller.create(3L, validInput(), moderator));
        verify(vocabulary).existsByLessonIdAndWordIgnoreCase(3L, "日本語");
        verifyNoMoreInteractions(vocabulary);
    }

    @Test
    @DisplayName("Creation rejects a missing lesson")
    void createRejectsMissingLesson() {
        assertThrows(RuntimeException.class, () -> controller.create(999L, validInput(), moderator));
        verifyNoInteractions(vocabulary);
    }

    @Test
    @DisplayName("Creation rejects a lesson of another skill")
    void createRejectsWrongSkill() {
        lesson.setSkillType(Lesson.SkillType.KANJI);
        assertThrows(RuntimeException.class, () -> controller.create(3L, validInput(), moderator));
        verifyNoInteractions(vocabulary);
    }

    @Test
    @DisplayName("Propagate save failure")
    void createPropagatesSaveFailure() {
        var failure = new IllegalStateException("Simulated repository failure");
        when(vocabulary.save(any(Vocabulary.class))).thenThrow(failure);
        assertSame(failure, assertThrows(IllegalStateException.class,
                () -> controller.create(3L, validInput(), moderator)));
    }
}
