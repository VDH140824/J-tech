package com.jtech.service;

import com.jtech.dto.request.TestManagementRequest;
import com.jtech.dto.response.TestManagementResponse;
import com.jtech.entity.User;
import com.jtech.repository.TestManagementQueryRepository;
import com.jtech.repository.TestManagementQueryRepository.TestRow;
import com.jtech.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit test Quản lý bài kiểm tra (TM-01 tạo, TM-02 sửa, TM-03 xuất bản / gỡ, TM-04 xóa / lưu trữ).
 * Bài học 10 (Từ vựng, chương 2), bài học 11 (Kanji, chương 2), bài học 12 (Ngữ pháp, chương 2).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TestManagementServiceTest {

    private static final String EMAIL = "mod@fpt.edu.vn";
    private static final BigDecimal PASS = new BigDecimal("70");

    @Mock private TestManagementQueryRepository queries;
    @Mock private UserRepository users;

    private TestManagementService service;
    private final List<TestManagementResponse.QuestionItem> bank = new ArrayList<>();

    @BeforeEach
    void setUp() {
        service = new TestManagementService(queries, users);
        when(users.findByEmail(EMAIL)).thenReturn(Optional.of(User.builder().userId(7L).email(EMAIL).build()));
        when(queries.lesson(10L)).thenReturn(Optional.of(new TestManagementQueryRepository.LessonInfo(10L, 2L, "VOCABULARY", "PUBLISHED")));
        when(queries.lesson(13L)).thenReturn(Optional.of(new TestManagementQueryRepository.LessonInfo(13L, 2L, "LISTENING", "PUBLISHED")));
        when(queries.chapterExists(2L)).thenReturn(true);
        when(queries.insert(any(TestRow.class), anyLong())).thenReturn(100L);
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.findSummary(anyLong())).thenAnswer(inv -> Optional.of(summary(inv.getArgument(0), 0)));
        when(queries.findQuestions(any())).thenAnswer(inv -> {
            Collection<Long> ids = inv.getArgument(0);
            return bank.stream().filter(q -> ids.contains(q.id())).toList();
        });
        bank.add(question(1L, "VOCABULARY", 10L, "ACTIVE", false, "PUBLISHED"));
        bank.add(question(2L, "VOCABULARY", 10L, "ACTIVE", false, "PUBLISHED"));
        bank.add(question(3L, "KANJI", 11L, "ACTIVE", false, "PUBLISHED"));
        bank.add(question(4L, "GRAMMAR", 12L, "ACTIVE", false, "PUBLISHED"));
        bank.add(question(5L, "VOCABULARY", 10L, "ACTIVE", true, "PUBLISHED"));   // câu luyện tập
        bank.add(question(6L, "VOCABULARY", 10L, "ARCHIVED", false, "PUBLISHED"));
        bank.add(question(7L, "VOCABULARY", 20L, "ACTIVE", false, "PUBLISHED"));  // bài học chương khác
        for (long id = 8L; id <= 10L; id++) bank.add(question(id, "VOCABULARY", 10L, "ACTIVE", false, "PUBLISHED"));
    }

    // ===================== helpers =====================

    private static TestManagementResponse.QuestionItem question(long id, String skill, long lessonId, String status,
            boolean exercise, String lessonStatus) {
        long chapter = lessonId == 20L ? 9L : 2L;
        return new TestManagementResponse.QuestionItem(id, skill, "MCQ", "EASY", status, exercise, "Câu " + id,
                "{}", lessonId, "Bài " + lessonId, lessonStatus, chapter);
    }

    private static TestManagementResponse.Summary summary(long id, long attempts) {
        return new TestManagementResponse.Summary(id, "MINI_TEST", "VOCABULARY", "DRAFT", "Đề", 1L, "N5", 2L, 2,
                "Chương 2", 10L, "Bài 10", 0, 10, PASS, attempts, LocalDateTime.now());
    }

    private static TestManagementRequest mini(List<Long> ids) {
        return new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", 10L, null, "  Mini test Bài 1  ",
                " mô tả ", 10, PASS, ids);
    }

    private static TestManagementRequest chapter(List<Long> ids) {
        return new TestManagementRequest(TestManagementRequest.TestType.CHAPTER_TEST, null, null, 2L, "Test chương 2", null,
                30, PASS, ids);
    }

    private static TestRow row(long id, String type, String skill, String status) {
        return new TestRow(id, type, skill, "MINI_TEST".equals(type) ? 10L : null, "CHAPTER_TEST".equals(type) ? 2L : null,
                "Đề", null, 10, PASS, status);
    }

    private List<TestManagementResponse.QuestionItem> pick(long... ids) {
        List<TestManagementResponse.QuestionItem> out = new ArrayList<>();
        for (long id : ids) out.add(bank.stream().filter(q -> q.id() == id).findFirst().orElseThrow());
        return out;
    }

    private static HttpStatus status(ResponseStatusException ex) {
        return HttpStatus.valueOf(ex.getStatusCode().value());
    }

    private ResponseStatusException assertStatus(HttpStatus expected, Runnable action) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, action::run);
        assertEquals(expected, status(ex));
        return ex;
    }

    @SuppressWarnings("unchecked")
    private List<TestManagementResponse.QuestionItem> savedQuestions() {
        ArgumentCaptor<List<TestManagementResponse.QuestionItem>> captor = ArgumentCaptor.forClass(List.class);
        verify(queries).replaceQuestions(anyLong(), captor.capture());
        return captor.getValue();
    }

    // ===================== TM-01 tạo =====================

    @Test
    void TM01_UTCID01_createMiniTest_draftWithLessonSkill() {
        service.create(mini(List.of(2L, 1L)), EMAIL);

        ArgumentCaptor<TestRow> captor = ArgumentCaptor.forClass(TestRow.class);
        verify(queries).insert(captor.capture(), eq(7L));
        TestRow saved = captor.getValue();
        assertEquals("MINI_TEST", saved.testType());
        assertEquals("VOCABULARY", saved.skill());
        assertEquals(Long.valueOf(10L), saved.lessonId());
        assertNull(saved.chapterId());
        assertEquals("Mini test Bài 1", saved.title());
        assertEquals("mô tả", saved.description());
        assertEquals("DRAFT", saved.status());
        assertEquals(List.of(2L, 1L), savedQuestions().stream().map(TestManagementResponse.QuestionItem::id).toList());
    }

    @Test
    void TM01_UTCID02_createChapterTest_skillAll() {
        service.create(chapter(List.of(1L, 3L, 4L)), EMAIL);

        ArgumentCaptor<TestRow> captor = ArgumentCaptor.forClass(TestRow.class);
        verify(queries).insert(captor.capture(), eq(7L));
        assertEquals("CHAPTER_TEST", captor.getValue().testType());
        assertEquals("ALL", captor.getValue().skill());
        assertEquals(Long.valueOf(2L), captor.getValue().chapterId());
        assertEquals(3, savedQuestions().size());
    }

    @Test
    void TM01_UTCID03_duplicateQuestionIds_keptOnce() {
        service.create(mini(List.of(1L, 1L, 2L)), EMAIL);
        assertEquals(List.of(1L, 2L), savedQuestions().stream().map(TestManagementResponse.QuestionItem::id).toList());
    }

    @Test
    void TM01_UTCID04_emptyDraftAllowed() {
        service.create(mini(null), EMAIL);
        assertTrue(savedQuestions().isEmpty());
    }

    @Test
    void TM01_UTCID05_exerciseQuestion_rejected() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(mini(List.of(5L)), EMAIL));
        verify(queries, never()).insert(any(), anyLong());
    }

    @Test
    void TM01_UTCID06_otherSkillInMiniTest_rejected() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(mini(List.of(3L)), EMAIL));
    }

    @Test
    void TM01_UTCID07_questionOfOtherChapter_rejected() {
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(chapter(List.of(7L)), EMAIL));
    }

    @Test
    void TM01_UTCID08_archivedQuestion_rejected() {
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(mini(List.of(6L)), EMAIL));
        assertTrue(ex.getReason().contains("đã lưu trữ"));
    }

    @Test
    void TM01_UTCID09_lessonNotVocabKanjiGrammar_rejected() {
        TestManagementRequest r = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", 13L, null, "Đề",
                null, 10, PASS, List.of());
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
    }

    @Test
    void TM01_UTCID10_invalidInfo_rejected() {
        TestManagementRequest noTitle = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", 10L, null,
                "  ", null, 10, PASS, List.of());
        TestManagementRequest badDuration = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", 10L,
                null, "Đề", null, 181, PASS, List.of());
        TestManagementRequest badScore = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", 10L, null,
                "Đề", null, 10, new BigDecimal("100.5"), List.of());
        TestManagementRequest noLesson = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", null, null,
                "Đề", null, 10, PASS, List.of());
        for (TestManagementRequest r : List.of(noTitle, badDuration, badScore, noLesson)) {
            assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
        }
        verify(queries, never()).insert(any(), anyLong());
    }

    @Test
    void TM01_UTCID11_kanjiMiniTest_byChapter() {
        TestManagementRequest r = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "KANJI", null, 2L,
                "Mini test Kanji · Chương 2", null, 10, PASS, List.of(3L));
        service.create(r, EMAIL);

        ArgumentCaptor<TestRow> captor = ArgumentCaptor.forClass(TestRow.class);
        verify(queries).insert(captor.capture(), eq(7L));
        assertEquals("MINI_TEST", captor.getValue().testType());
        assertEquals("KANJI", captor.getValue().skill());
        assertNull(captor.getValue().lessonId());
        assertEquals(Long.valueOf(2L), captor.getValue().chapterId());
        assertEquals(1, savedQuestions().size());
    }

    @Test
    void TM01_UTCID12_kanjiMiniTest_rejectsVocabularyQuestion() {
        TestManagementRequest r = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "KANJI", null, 2L,
                "Mini test Kanji · Chương 2", null, 10, PASS, List.of(1L));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
    }

    @Test
    void TM01_UTCID13_miniTestSkillMissingOrLessonMismatch_rejected() {
        TestManagementRequest noSkill = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, null, 10L,
                null, "Đề", null, 10, PASS, List.of());
        TestManagementRequest mismatch = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "GRAMMAR",
                10L, null, "Đề", null, 10, PASS, List.of());
        TestManagementRequest kanjiNoChapter = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST,
                "KANJI", 10L, null, "Đề", null, 10, PASS, List.of());
        for (TestManagementRequest r : List.of(noSkill, mismatch, kanjiNoChapter)) {
            assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
        }
        verify(queries, never()).insert(any(), anyLong());
    }

    // ===================== TM-02 sửa =====================

    @Test
    void TM02_UTCID01_updateDraft_replacesQuestions() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.questionsOf(100L)).thenReturn(pick(1L));
        service.update(100L, mini(List.of(1L, 2L)), EMAIL);

        verify(queries).updateInfo(eq(100L), eq("Mini test Bài 1"), eq("mô tả"), eq(10), eq(PASS), eq(7L));
        assertEquals(2, savedQuestions().size());
    }

    @Test
    void TM02_UTCID02_lockedTest_changeQuestions_conflict() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "PUBLISHED")));
        when(queries.questionsOf(100L)).thenReturn(pick(1L));
        when(queries.countAttempts(100L)).thenReturn(3L);
        assertStatus(HttpStatus.CONFLICT, () -> service.update(100L, mini(List.of(1L, 2L)), EMAIL));
        verify(queries, never()).replaceQuestions(anyLong(), anyList());
    }

    @Test
    void TM02_UTCID03_lockedTest_titleOnly_allowed() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "PUBLISHED")));
        when(queries.questionsOf(100L)).thenReturn(pick(1L));
        when(queries.countAttempts(100L)).thenReturn(3L);
        service.update(100L, mini(List.of(1L)), EMAIL);

        verify(queries).updateInfo(eq(100L), eq("Mini test Bài 1"), any(), eq(10), eq(PASS), eq(7L));
        verify(queries, never()).replaceQuestions(anyLong(), anyList());
    }

    @Test
    void TM02_UTCID04_archivedQuestionAlreadyInTest_kept() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.questionsOf(100L)).thenReturn(pick(6L));
        service.update(100L, mini(List.of(6L, 1L)), EMAIL);
        assertEquals(2, savedQuestions().size());
    }

    @Test
    void TM02_UTCID05_archivedTest_conflict() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "ARCHIVED")));
        assertStatus(HttpStatus.CONFLICT, () -> service.update(100L, mini(List.of(1L)), EMAIL));
    }

    @Test
    void TM02_UTCID06_notFound() {
        when(queries.findTest(404L)).thenReturn(Optional.empty());
        assertStatus(HttpStatus.NOT_FOUND, () -> service.update(404L, mini(List.of()), EMAIL));
    }

    // ===================== TM-03 xuất bản / gỡ xuất bản =====================

    @Test
    void TM03_UTCID01_publishMiniTest() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.questionsOf(100L)).thenReturn(pick(1L, 2L, 8L, 9L, 10L));
        service.publish(100L, EMAIL);
        verify(queries).updateStatus(100L, "PUBLISHED", 7L);
    }

    @Test
    void TM03_UTCID02_publishEmpty_rejected() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.questionsOf(100L)).thenReturn(List.of());
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(100L, EMAIL));
        assertEquals(TestManagementService.TOO_FEW.formatted("Mini test", 5, 0), ex.getReason());
    }

    @Test
    void TM03_UTCID03_chapterTestMissingPart_rejected() {
        when(queries.findTest(200L)).thenReturn(Optional.of(row(200L, "CHAPTER_TEST", "ALL", "DRAFT")));
        when(queries.questionsOf(200L)).thenReturn(pick(1L, 3L));
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(200L, EMAIL));
        assertTrue(ex.getReason().contains("Ngữ pháp"));
        verify(queries, never()).updateStatus(anyLong(), any(), anyLong());
    }

    @Test
    void TM03_UTCID04_lessonNotPublished_rejected() {
        bank.set(0, question(1L, "VOCABULARY", 10L, "ACTIVE", false, "DRAFT"));
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.questionsOf(100L)).thenReturn(pick(1L, 2L, 8L, 9L, 10L));
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(100L, EMAIL));
    }

    @Test
    void TM03_UTCID05_otherPublished_conflict() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        when(queries.questionsOf(100L)).thenReturn(pick(1L, 2L, 8L, 9L, 10L));
        when(queries.otherPublished(any())).thenReturn(true);
        ResponseStatusException ex = assertStatus(HttpStatus.CONFLICT, () -> service.publish(100L, EMAIL));
        assertEquals(TestManagementService.DUPLICATE_PUBLISHED_MINI, ex.getReason());
    }

    @Test
    void TM03_UTCID06_unpublishWithAttempts_conflict() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "PUBLISHED")));
        when(queries.countAttempts(100L)).thenReturn(1L);
        assertStatus(HttpStatus.CONFLICT, () -> service.unpublish(100L, EMAIL));
    }

    @Test
    void TM03_UTCID07_unpublish_backToDraft() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "PUBLISHED")));
        service.unpublish(100L, EMAIL);
        verify(queries).updateStatus(100L, "DRAFT", 7L);
    }

    // ===================== TM-04 xóa / lưu trữ =====================

    @Test
    void TM04_UTCID01_noAttempts_hardDelete() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "DRAFT")));
        TestManagementResponse.DeleteResult result = service.delete(100L, EMAIL);
        assertFalse(result.archived());
        verify(queries).delete(100L);
    }

    @Test
    void TM04_UTCID02_withAttempts_archived() {
        when(queries.findTest(100L)).thenReturn(Optional.of(row(100L, "MINI_TEST", "VOCABULARY", "PUBLISHED")));
        when(queries.countAttempts(100L)).thenReturn(2L);
        TestManagementResponse.DeleteResult result = service.delete(100L, EMAIL);
        assertTrue(result.archived());
        assertEquals(TestManagementService.ARCHIVE_REASON, result.reason());
        verify(queries).updateStatus(100L, "ARCHIVED", 7L);
        verify(queries, never()).delete(anyLong());
    }

    // ===================== TM-05 giới hạn số câu, thời gian =====================

    @Test
    void TM05_UTCID01_miniTestDurationOutOfRange_rejected() {
        TestManagementRequest r = new TestManagementRequest(TestManagementRequest.TestType.MINI_TEST, "VOCABULARY", 10L,
                null, "Đề", null, 25, PASS, List.of(1L));
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
        assertEquals(TestManagementService.BAD_DURATION.formatted("mini test", 5, 20), ex.getReason());
    }

    @Test
    void TM05_UTCID02_chapterTestDurationOutOfRange_rejected() {
        TestManagementRequest r = new TestManagementRequest(TestManagementRequest.TestType.CHAPTER_TEST, null, null, 2L,
                "Đề", null, 10, PASS, List.of());
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(r, EMAIL));
        assertEquals(TestManagementService.BAD_DURATION.formatted("test chương", 15, 40), ex.getReason());
    }

    @Test
    void TM05_UTCID03_miniTestTooManyQuestions_rejectedOnSave() {
        List<Long> ids = new ArrayList<>();
        for (long id = 1000L; id < 1021L; id++) ids.add(id);
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(mini(ids), EMAIL));
        assertEquals(TestManagementService.TOO_MANY.formatted("Mini test", 20, 21), ex.getReason());
        verify(queries, never()).insert(any(), anyLong());
    }

    @Test
    void TM05_UTCID04_chapterTestTooFewQuestions_rejectedOnPublish() {
        when(queries.findTest(200L)).thenReturn(Optional.of(row(200L, "CHAPTER_TEST", "ALL", "DRAFT")));
        when(queries.questionsOf(200L)).thenReturn(pick(1L, 3L, 4L));
        ResponseStatusException ex = assertStatus(HttpStatus.BAD_REQUEST, () -> service.publish(200L, EMAIL));
        assertEquals(TestManagementService.TOO_FEW.formatted("Test chương", 15, 3), ex.getReason());
    }
}
