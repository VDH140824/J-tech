package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.controller.LessonController;
import com.jtech.dto.request.LessonRequest;
import com.jtech.entity.Chapter;
import com.jtech.entity.Course;
import com.jtech.entity.Lesson;
import com.jtech.exception.GlobalExceptionHandler;
import com.jtech.repository.ChapterRepository;
import com.jtech.repository.LessonRepository;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LessonServiceTest {
    static ValidatorFactory factory;
    LessonRepository lessons;
    ChapterRepository chapters;
    LessonService service;
    CloudinaryService cloudinary;
    Chapter chapter;
    Lesson lesson;

    @BeforeAll static void openValidator() { factory = Validation.buildDefaultValidatorFactory(); }
    @AfterAll static void closeValidator() { factory.close(); }

    @BeforeEach void setup() {
        lessons = mock(LessonRepository.class);
        chapters = mock(ChapterRepository.class);
        cloudinary = mock(CloudinaryService.class);
        when(cloudinary.uploadDocument(any())).thenAnswer(inv -> {
            org.springframework.web.multipart.MultipartFile file = inv.getArgument(0);
            if (file == null || file.isEmpty()) throw new IllegalArgumentException("Vui lòng chọn tài liệu đính kèm");
            return Map.of("name", "file.pdf", "url", "https://example.test/file.pdf", "publicId", "Jtech/Lessons/Documents/new.pdf");
        });
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        service = new LessonService(lessons, chapters, factory.getValidator(), cloudinary);
        chapter = new Chapter();
        chapter.setId(10L);
        lesson = Lesson.builder().id(20L).chapter(chapter).skillType(Lesson.SkillType.READING)
                .lessonNo(2).title("Bài học").description("Nội dung").documents("[]")
                .displayOrder(2).status(Course.Status.PUBLISHED).build();
    }

    static LessonRequest request(int field, String value) {
        String[] text = {"Bài học", "Nội dung", "[]"};
        if (field >= 0) text[field] = value;
        return new LessonRequest(null, 2, text[0], text[1], text[2], 2, null);
    }

    static Stream<String> emptyText() { return Stream.of(null, ""); }

    static Stream<String> blankText() { return Stream.of("   ", "\t\r\n ", "\u00a0\u3000"); }

    static Stream<String> tooLongText() {
        return Stream.of("a".repeat(101), "ế".repeat(101), "語".repeat(101));
    }

    static Stream<String> maxLengthText() {
        return Stream.of("a".repeat(100), "ế".repeat(100), "語".repeat(100));
    }

    static Stream<String> trimText() {
        return Stream.concat(maxLengthText(), Stream.of("Nội  dung bài học"));
    }

    @ParameterizedTest
    @MethodSource("emptyText")
    void createLesson_emptyTitle(String value) {
        assertInvalidText(false, 0, value);
    }

    @ParameterizedTest
    @MethodSource("blankText")
    void createLesson_blankTitle(String value) {
        assertInvalidText(false, 0, value);
    }

    @ParameterizedTest
    @MethodSource("tooLongText")
    void createLesson_titleTooLong(String value) {
        assertInvalidText(false, 0, value);
    }

    @ParameterizedTest
    @MethodSource("maxLengthText")
    void createLesson_titleMaxLength(String value) {
        assertSavedText(false, 0, value, value);
    }

    @ParameterizedTest
    @MethodSource("trimText")
    void createLesson_trimTitle(String value) {
        assertSavedText(false, 0, " \t" + value + "\r\n ", value);
    }

    @Test
    void createLesson_titleSpaces() {
        assertSavedText(false, 0, "Nội  dung bài học", "Nội  dung bài học");
    }

    @ParameterizedTest
    @MethodSource("emptyText")
    void createLesson_emptyDescription(String value) {
        assertInvalidText(false, 1, value);
    }

    @ParameterizedTest
    @MethodSource("blankText")
    void createLesson_blankDescription(String value) {
        assertInvalidText(false, 1, value);
    }

    @ParameterizedTest
    @MethodSource("tooLongText")
    void createLesson_descriptionTooLong(String value) {
        assertInvalidText(false, 1, value);
    }

    @ParameterizedTest
    @MethodSource("maxLengthText")
    void createLesson_descriptionMaxLength(String value) {
        assertSavedText(false, 1, value, value);
    }

    @ParameterizedTest
    @MethodSource("trimText")
    void createLesson_trimDescription(String value) {
        assertSavedText(false, 1, " \t" + value + "\r\n ", value);
    }

    @Test
    void createLesson_descriptionSpaces() {
        assertSavedText(false, 1, "Nội  dung bài học", "Nội  dung bài học");
    }







    @ParameterizedTest
    @MethodSource("emptyText")
    void updateLesson_emptyTitle(String value) {
        assertInvalidText(true, 0, value);
    }

    @ParameterizedTest
    @MethodSource("blankText")
    void updateLesson_blankTitle(String value) {
        assertInvalidText(true, 0, value);
    }

    @ParameterizedTest
    @MethodSource("tooLongText")
    void updateLesson_titleTooLong(String value) {
        assertInvalidText(true, 0, value);
    }

    @ParameterizedTest
    @MethodSource("maxLengthText")
    void updateLesson_titleMaxLength(String value) {
        assertSavedText(true, 0, value, value);
    }

    @ParameterizedTest
    @MethodSource("trimText")
    void updateLesson_trimTitle(String value) {
        assertSavedText(true, 0, " \t" + value + "\r\n ", value);
    }

    @Test
    void updateLesson_titleSpaces() {
        assertSavedText(true, 0, "Nội  dung bài học", "Nội  dung bài học");
    }

    @ParameterizedTest
    @MethodSource("emptyText")
    void updateLesson_emptyDescription(String value) {
        assertInvalidText(true, 1, value);
    }

    @ParameterizedTest
    @MethodSource("blankText")
    void updateLesson_blankDescription(String value) {
        assertInvalidText(true, 1, value);
    }

    @ParameterizedTest
    @MethodSource("tooLongText")
    void updateLesson_descriptionTooLong(String value) {
        assertInvalidText(true, 1, value);
    }

    @ParameterizedTest
    @MethodSource("maxLengthText")
    void updateLesson_descriptionMaxLength(String value) {
        assertSavedText(true, 1, value, value);
    }

    @ParameterizedTest
    @MethodSource("trimText")
    void updateLesson_trimDescription(String value) {
        assertSavedText(true, 1, " \t" + value + "\r\n ", value);
    }

    @Test
    void updateLesson_descriptionSpaces() {
        assertSavedText(true, 1, "Nội  dung bài học", "Nội  dung bài học");
    }







    void assertInvalidText(boolean update, int field, String value) {
        var input = request(field, value);
        var violations = factory.getValidator().validate(input);
        assertEquals(Set.of(new String[]{"title", "description", "documents"}[field]),
                violations.stream().map(v -> v.getPropertyPath().toString()).collect(java.util.stream.Collectors.toSet()));
        assertThrows(IllegalArgumentException.class, () -> save(update, input));
        verifyNoInteractions(lessons, chapters);
    }

    void assertSavedText(boolean update, int field, String value, String expected) {
        prepareSave(update);
        var result = save(update, request(field, value));
        assertEquals(expected, new String[]{result.title(), result.description(), result.documents()}[field]);
        verify(lessons).save(argThat(saved -> expected.equals(
                new String[]{saved.getTitle(), saved.getDescription(), saved.getDocuments()}[field])));
    }

    static Stream<Arguments> invalidNumbers() {
        return Stream.of(false, true).flatMap(update -> Stream.of(true, false).flatMap(number ->
                Stream.of((Integer) null, 0, -1).map(value -> Arguments.of(update, number, value))));
    }

    @ParameterizedTest
    @MethodSource("invalidNumbers")
    void saveLesson_invalidNumbers(boolean update, boolean lessonNumber, Integer value) {
        var input = new LessonRequest(null, lessonNumber ? value : Integer.valueOf(2), "Bài học", "Nội dung", "[]",
                lessonNumber ? Integer.valueOf(2) : value, null);
        assertThrows(IllegalArgumentException.class, () -> save(update, input));
        verifyNoInteractions(lessons, chapters);
    }

    @Test void saveLesson_defaultValues() {
        prepareSave(false);
        var created = save(false, request(-1, null));
        assertEquals(Lesson.SkillType.GRAMMAR, created.skillType());
        assertEquals(Course.Status.DRAFT, created.status());
        assertEquals(10L, created.chapterId());
        when(lessons.findById(20L)).thenReturn(Optional.of(lesson));
        var updated = save(true, request(-1, null));
        assertEquals(Lesson.SkillType.READING, updated.skillType());
        assertEquals(Course.Status.PUBLISHED, updated.status());
        verify(lessons).existsByChapterIdAndSkillTypeAndDisplayOrderAndIdNot(10L, Lesson.SkillType.READING, 2, 20L);
    }

    @Test void saveLesson_success() {
        prepareSave(false);
        var result = service.createLesson(null, 10L, new LessonRequest(Lesson.SkillType.KANJI, 1,
                "Bài học", "Nội dung", "[]", 1, Course.Status.HIDDEN), file());
        assertEquals(1, result.lessonNo());
        assertEquals(1, result.displayOrder());
        assertEquals(Lesson.SkillType.KANJI, result.skillType());
        assertEquals(Course.Status.HIDDEN, result.status());
        when(lessons.findById(20L)).thenReturn(Optional.of(lesson));
        result = service.updateLesson(20L, new LessonRequest(Lesson.SkillType.KANJI, 3,
                "Bài mới", "Nội dung mới", "{}", 3, Course.Status.HIDDEN), null);
        assertEquals(3, result.lessonNo());
        assertEquals(3, result.displayOrder());
        assertEquals(Lesson.SkillType.KANJI, result.skillType());
        assertEquals(Course.Status.HIDDEN, result.status());
    }

    @Test void lesson_notFound() {
        assert404(() -> service.getLessonById(20L));
        assert404(() -> service.updateLesson(20L, request(-1, null), null));
        assert404(() -> service.createLesson(null, 10L, request(-1, null), file()));
        assert404(() -> service.createLesson(99L, 10L, request(-1, null), file()));
        assert404(() -> service.getLessonsByCourseAndChapter(99L, 10L, null, null));
        assert404(() -> service.deleteLesson(20L));
        verify(lessons, never()).save(any());
        verify(lessons, never()).deleteById(any());
    }

    @Test void saveLesson_duplicateOrder() {
        when(chapters.findById(10L)).thenReturn(Optional.of(chapter));
        when(lessons.existsByChapterIdAndSkillTypeAndDisplayOrder(10L, Lesson.SkillType.GRAMMAR, 2)).thenReturn(true);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> save(false, request(-1, null))).getStatusCode().value());
        when(lessons.findById(20L)).thenReturn(Optional.of(lesson));
        when(lessons.existsByChapterIdAndSkillTypeAndDisplayOrderAndIdNot(10L, Lesson.SkillType.READING, 2, 20L)).thenReturn(true);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> save(true, request(-1, null))).getStatusCode().value());
        verify(lessons, never()).save(any());
    }

    @Test void getLessons_filters() {
        Lesson second = Lesson.builder().id(21L).chapter(chapter).build();
        var rows = List.of(lesson, second);
        when(lessons.findByChapterIdOrderByDisplayOrderAscLessonNoAscIdAsc(10L)).thenReturn(rows);
        when(lessons.findByChapterIdAndSkillTypeOrderByDisplayOrderAscLessonNoAscIdAsc(10L, Lesson.SkillType.READING)).thenReturn(rows);
        when(lessons.findByChapterIdAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(10L, Course.Status.PUBLISHED)).thenReturn(rows);
        when(lessons.findByChapterIdAndSkillTypeAndStatusOrderByDisplayOrderAscLessonNoAscIdAsc(10L, Lesson.SkillType.READING, Course.Status.PUBLISHED)).thenReturn(rows);
        for (Lesson.SkillType skill : new Lesson.SkillType[]{null, Lesson.SkillType.READING}) {
            for (Course.Status status : new Course.Status[]{null, Course.Status.PUBLISHED}) {
                assertEquals(List.of(20L, 21L), service.getLessonsByChapter(10L, skill, status).stream().map(r -> r.id()).toList());
            }
        }
        assertTrue(service.getLessonsByChapter(999L, null, null).isEmpty());
        when(chapters.findByIdAndCourseId(10L, 1L)).thenReturn(Optional.of(chapter));
        assertEquals(2, service.getLessonsByCourseAndChapter(1L, 10L, null, null).size());
    }

    @Test void getAndDeleteLesson_success() {
        when(lessons.findById(20L)).thenReturn(Optional.of(lesson));
        var result = service.getLessonById(20L);
        assertEquals(20L, result.id());
        assertEquals(lesson.getTitle(), result.title());
        when(lessons.existsById(20L)).thenReturn(true);
        service.deleteLesson(20L);
        verify(lessons).deleteById(20L);
    }


    @AfterEach void clearTransactions() { org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization(); }

    private org.springframework.mock.web.MockMultipartFile file() {
        return new org.springframework.mock.web.MockMultipartFile("file", "file.pdf", "application/pdf", "%PDF-1.4".getBytes());
    }

    @Test void lessonApi_statusCodes() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new LessonController(service)).setControllerAdvice(new GlobalExceptionHandler()).build();
        prepareSave(false);
        var json = new org.springframework.mock.web.MockMultipartFile("request", "", "application/json", new ObjectMapper().writeValueAsBytes(request(-1, null)));
        mvc.perform(multipart("/chapters/10/lessons").file(json).file(file())).andExpect(status().isCreated()).andExpect(jsonPath("$.documents").isNotEmpty());
        when(lessons.findById(20L)).thenReturn(Optional.of(lesson));
        mvc.perform(multipart(org.springframework.http.HttpMethod.PUT, "/lessons/20").file(json)).andExpect(status().isOk());
        mvc.perform(multipart("/chapters/10/lessons").file(json)).andExpect(status().isBadRequest());
    }

    @Test void createLesson_missingFile() {
        prepareSave(false);
        assertThrows(IllegalArgumentException.class, () -> service.createLesson(null, 10L, request(-1, null), null));
        verify(lessons, never()).save(any());
    }

    @Test void updateLesson_keepDocument() {
        prepareSave(true);
        lesson.setDocuments("{\"name\":\"old.pdf\"}");
        assertEquals(lesson.getDocuments(), service.updateLesson(20L, request(-1, null), null).documents());
        verifyNoInteractions(cloudinary);
    }

    @Test void updateLesson_replaceDocumentAfterCommit() {
        prepareSave(true);
        lesson.setDocuments("{\"publicId\":\"Jtech/Lessons/Documents/old.pdf\"}");
        var result = service.updateLesson(20L, request(-1, null), file());
        assertTrue(result.documents().contains("new.pdf"));
        verify(cloudinary, never()).deleteDocument(any());
        org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
        verify(cloudinary).deleteDocument("Jtech/Lessons/Documents/old.pdf");
    }

    @Test void createLesson_saveFailedCleanup() {
        prepareSave(false);
        when(lessons.save(any())).thenThrow(new IllegalStateException("DB failed"));
        assertThrows(IllegalStateException.class, () -> service.createLesson(null, 10L, request(-1, null), file()));
        org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(1));
        verify(cloudinary).deleteDocument("Jtech/Lessons/Documents/new.pdf");
    }

    @Test void createLesson_uploadFailed() {
        prepareSave(false);
        doThrow(new IllegalStateException("Upload failed")).when(cloudinary).uploadDocument(any());
        assertThrows(IllegalStateException.class, () -> service.createLesson(null, 10L, request(-1, null), file()));
        verify(lessons, never()).save(any());
    }

    void prepareSave(boolean update) {
        if (update) when(lessons.findById(20L)).thenReturn(Optional.of(lesson));
        else when(chapters.findById(10L)).thenReturn(Optional.of(chapter));
        when(lessons.save(any(Lesson.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    com.jtech.dto.response.LessonResponse save(boolean update, LessonRequest input) {
        return update ? service.updateLesson(20L, input, null) : service.createLesson(null, 10L, input, file());
    }

    void assert404(org.junit.jupiter.api.function.Executable action) {
        assertEquals(404, assertThrows(ResponseStatusException.class, action).getStatusCode().value());
    }
}
