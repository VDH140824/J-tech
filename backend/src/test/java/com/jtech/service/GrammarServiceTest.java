package com.jtech.service;

import com.jtech.dto.request.GrammarCreateRequest;
import com.jtech.dto.request.GrammarUpdateRequest;
import com.jtech.dto.response.CloudinaryUploadResponse;
import com.jtech.dto.response.GrammarDetailResponse;
import com.jtech.entity.Grammar;
import com.jtech.entity.Lesson;
import com.jtech.repository.GrammarRepository;
import com.jtech.repository.LessonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.provider.Arguments;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Service-level acceptance tests for the agreed requirements, including required
 * text <= 100 characters. These requirements deliberately
 * remain assertions even when the current production service does not enforce them.
 * Transaction callbacks are simulated; no database or Cloudinary connection is used.
 */
class GrammarServiceTest {
    private static final long LESSON_ID = 10L;
    private static final long GRAMMAR_ID = 20L;
    private static final LocalDateTime CREATED = LocalDateTime.of(2026, 1, 1, 8, 0);
    private static final LocalDateTime UPDATED = LocalDateTime.of(2026, 1, 2, 9, 0);

    private final GrammarRepository grammarRepository = mock(GrammarRepository.class);
    private final LessonRepository lessonRepository = mock(LessonRepository.class);
    private final CloudinaryService cloudinaryService = mock(CloudinaryService.class);
    private final MultipartFile videoFile = mock(MultipartFile.class);
    private final GrammarService service = new GrammarService(grammarRepository, lessonRepository, cloudinaryService);

    private Lesson lesson;
    private Grammar grammar;

    enum TextField { structureName, meaningVi, usageExplanation, exampleJp, exampleVi }

    @BeforeEach
    void setUp() {
        lesson = new Lesson();
        lesson.setId(LESSON_ID);
        lesson.setSkillType(Lesson.SkillType.GRAMMAR);
        grammar = Grammar.builder().id(GRAMMAR_ID).lesson(lesson)
                .structureName("old structure").meaningVi("old meaning")
                .usageExplanation("old usage").exampleJp("old example JP").exampleVi("old example VI")
                .videoUrl("https://example.test/old.mp4").videoPublicId("old-video")
                .videoDurationSec(30).displayOrder(1).status(Grammar.Status.PUBLISHED)
                .createdAt(CREATED).updatedAt(UPDATED).build();
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("UTCID01: View grammar detail successfully")
    void getByLessonViewGrammarDetailSuccessfully() {
        when(lessonRepository.existsById(LESSON_ID)).thenReturn(true);
        when(grammarRepository.findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID))
                .thenReturn(List.of(grammar));
        assertEquals(List.of(responseOf(grammar)), service.getByLesson(LESSON_ID, null));
        verify(grammarRepository).findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID);
    }

    @Test
    @DisplayName("UTCID02: Lesson has no grammar")
    void getByLessonLessonHasNoGrammar() {
        when(lessonRepository.existsById(LESSON_ID)).thenReturn(true);
        when(grammarRepository.findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID)).thenReturn(List.of());
        assertTrue(service.getByLesson(LESSON_ID, null).isEmpty());
    }

    @Test
    @DisplayName("UTCID03: Lesson does not exist")
    void getByLessonLessonDoesNotExist() {
        when(lessonRepository.existsById(LESSON_ID)).thenReturn(false);
        assertHttp(HttpStatus.NOT_FOUND, "Lesson not found", () -> service.getByLesson(LESSON_ID, null));
        verifyNoInteractions(grammarRepository);
    }

    @Test
    @DisplayName("UTCID04: save all request fields and map the persisted entity")
    void createSavesAndMapsAllFields() {
        foundLesson();
        when(grammarRepository.save(any(Grammar.class))).thenAnswer(invocation -> {
            Grammar saved = invocation.getArgument(0);
            saved.setId(77L);
            saved.setCreatedAt(CREATED);
            return saved;
        });
        GrammarDetailResponse result = service.create(LESSON_ID,
                createRequest(texts(), "https://example.test/new.mp4", "new-video", 14, Grammar.Status.HIDDEN));
        ArgumentCaptor<Grammar> captured = ArgumentCaptor.forClass(Grammar.class);
        verify(grammarRepository).save(captured.capture());
        Grammar saved = captured.getValue();
        assertAll(() -> assertSame(lesson, saved.getLesson()),
                () -> assertEquals(List.of(texts()), textValues(saved)),
                () -> assertEquals("https://example.test/new.mp4", saved.getVideoUrl()),
                () -> assertEquals("new-video", saved.getVideoPublicId()),
                () -> assertEquals(14, saved.getVideoDurationSec()),
                () -> assertEquals(Grammar.Status.HIDDEN, saved.getStatus()),
                () -> assertEquals(77L, result.id()),
                () -> assertEquals(responseOf(saved), result));
        verifyNoInteractions(cloudinaryService);
    }

    @Test
    @DisplayName("UTCID05: omitted status defaults to DRAFT and explicit status is preserved")
    void createAppliesDefaults() {
        for (Arguments testCase : defaults().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            Grammar.Status status = (Grammar.Status) data[0];
            Grammar.Status expectedStatus = (Grammar.Status) data[1];
            foundLesson();
            saveReturnsArgument();
            var result = service.create(LESSON_ID, createRequest(texts(), null, null, null, status));
            assertEquals(expectedStatus, result.status());
        }
    }

    @Test
    @DisplayName("UTCID06: reject null, empty, blank and 101-character text")
    void createRejectsInvalidText() {
        for (Arguments testCase : invalidText().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            TextField field = (TextField) data[0];
            String scenario = (String) data[1];
            String value = (String) data[2];
            prepareRejectedCreate();
            String[] values = texts();
            values[field.ordinal()] = value;
            assertAll(() -> assertBadRequest(() -> service.create(LESSON_ID, createRequest(values))),
                    () -> verify(grammarRepository, never()).save(any()),
                    () -> verifyNoInteractions(cloudinaryService));
        }
    }

    @Test
    @DisplayName("UTCID07: accept 100 characters and trim surrounding whitespace")
    void createAcceptsBoundaryAndTrims() {
        for (Arguments testCase : validText().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            TextField field = (TextField) data[0];
            String scenario = (String) data[1];
            String value = (String) data[2];
            String expected = (String) data[3];
            foundLesson();
            saveReturnsArgument();
            String[] values = texts();
            values[field.ordinal()] = value;
            var result = service.create(LESSON_ID, createRequest(values));
            ArgumentCaptor<Grammar> captured = ArgumentCaptor.forClass(Grammar.class);
            verify(grammarRepository).save(captured.capture());
            assertAll(() -> assertEquals(expected, textValues(captured.getValue()).get(field.ordinal())),
                    () -> assertEquals(responseOf(captured.getValue()), result));
        }
    }

    @Test
    @DisplayName("UTCID08: URL and public ID must be supplied together")
    void createRejectsIncompleteVideo() {
        for (Arguments testCase : incompleteVideo().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            String scenario = (String) data[0];
            String url = (String) data[1];
            String publicId = (String) data[2];
            foundLesson();
            assertHttp(HttpStatus.BAD_REQUEST, "Video URL and public ID must be provided together",
                    () -> service.create(LESSON_ID, createRequest(texts(), url, publicId, null, Grammar.Status.DRAFT)));
            verify(grammarRepository, never()).save(any());
            verifyNoInteractions(cloudinaryService);
        }
    }

    @Test
    @DisplayName("UTCID09: both video fields absent or blank are allowed")
    void createAcceptsAbsentVideo() {
        for (Arguments testCase : absentVideoPairs().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            String url = (String) data[0];
            String publicId = (String) data[1];
            foundLesson();
            saveReturnsArgument();
            var result = service.create(LESSON_ID, createRequest(texts(), url, publicId, null, Grammar.Status.DRAFT));
            assertAll(() -> assertEquals(url, result.videoUrl()), () -> assertEquals(publicId, result.videoPublicId()),
                    () -> assertNull(result.videoDurationSec()));
            verifyNoInteractions(cloudinaryService);
        }
    }

    @Test
    @DisplayName("UTCID10: propagate repository save failure")
    void createPropagatesSaveFailure() {
        foundLesson();
        var error = new DataIntegrityViolationException("save failed");
        when(grammarRepository.save(any())).thenThrow(error);
        assertSame(error, assertThrows(DataIntegrityViolationException.class,
                () -> service.create(LESSON_ID, createRequest(texts()))));
        verifyNoInteractions(cloudinaryService);
    }

    // UTCID11: ID ngữ pháp không tồn tại; trả 404 và không lưu dữ liệu.
    @Test
    @DisplayName("UTCID11: missing grammar returns 404")
    void updateRejectsMissingGrammar() {
        when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.empty());
        assertHttp(HttpStatus.NOT_FOUND, "Grammar not found",
                () -> service.update(GRAMMAR_ID, updateRequest(texts()), videoFile));
        verify(grammarRepository, never()).save(any());
        verifyNoInteractions(cloudinaryService);
    }

    // UTCID12: Cập nhật nội dung, thứ tự, trạng thái khi không có file mới; giữ video cũ.
    @Test
    @DisplayName("UTCID12: update text and retain video metadata without a new file")
    void updateUpdatesTextAndKeepsVideo() {
        foundGrammar();
        saveReturnsArgument();
        var result = service.update(GRAMMAR_ID,
                updateRequest(new String[]{" new structure ", " new meaning ", " new usage ", " new JP ", " new VI "},
                        null, null, 999, Grammar.Status.HIDDEN), null);
        assertAll(() -> assertEquals(List.of("new structure", "new meaning", "new usage", "new JP", "new VI"), textValues(grammar)),
                () -> assertEquals(Grammar.Status.HIDDEN, grammar.getStatus()),
                () -> assertEquals("https://example.test/old.mp4", result.videoUrl()),
                () -> assertEquals("old-video", result.videoPublicId()),
                () -> assertEquals(30, result.videoDurationSec()),
                () -> assertEquals(CREATED, result.createdAt()),
                () -> assertEquals(UPDATED, result.updatedAt()),
                () -> assertEquals(responseOf(grammar), result),
                () -> assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty()));
        verify(grammarRepository).save(grammar);
        verifyNoInteractions(cloudinaryService);
    }

    // UTCID13: Từ chối từng trường nội dung null, rỗng, chỉ có khoảng trắng hoặc quá 100 ký tự.
    @Test
    @DisplayName("UTCID13: reject invalid text before mutation, upload or save")
    void updateRejectsInvalidTextWithoutSideEffects() {
        for (Arguments testCase : invalidText().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            TextField field = (TextField) data[0];
            String scenario = (String) data[1];
            String value = (String) data[2];
            prepareRejectedUpdate();
            var before = responseOf(grammar);
            String[] values = texts();
            values[field.ordinal()] = value;
            assertAll(() -> assertBadRequest(() -> service.update(GRAMMAR_ID, updateRequest(values), videoFile)),
                    () -> assertEquals(before, responseOf(grammar), "Rejected updates must not mutate the entity"),
                    () -> verify(grammarRepository, never()).save(any()),
                    () -> verifyNoInteractions(cloudinaryService));
        }
    }

    // UTCID14: Chấp nhận nội dung đúng 100 ký tự và loại bỏ khoảng trắng đầu/cuối.
    @Test
    @DisplayName("UTCID14: accept 100 characters and trim surrounding whitespace")
    void updateAcceptsBoundaryAndTrims() {
        for (Arguments testCase : validText().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            TextField field = (TextField) data[0];
            String scenario = (String) data[1];
            String value = (String) data[2];
            String expected = (String) data[3];
            foundGrammar();
            saveReturnsArgument();
            String[] values = texts();
            values[field.ordinal()] = value;
            var result = service.update(GRAMMAR_ID, updateRequest(values), null);
            assertAll(() -> assertEquals(expected, textValues(grammar).get(field.ordinal())),
                    () -> assertEquals(responseOf(grammar), result));
            verifyNoInteractions(cloudinaryService);
        }
    }

    // UTCID15: Từ chối thay video bằng URL/public ID gửi trực tiếp, dù có kèm file hay không.
    @Test
    @DisplayName("UTCID15: reject replacement URL/public ID even when a file is supplied")
    void updateRejectsReplacementMetadata() {
        for (Arguments testCase : replacementMetadata().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            String url = (String) data[0];
            String publicId = (String) data[1];
            boolean withFile = (Boolean) data[2];
            foundGrammar();
            var before = responseOf(grammar);
            assertHttp(HttpStatus.BAD_REQUEST, "Video replacement requires a video file",
                    () -> service.update(GRAMMAR_ID,
                            updateRequest(texts(), url, publicId, null, Grammar.Status.DRAFT), withFile ? videoFile : null));
            assertEquals(before, responseOf(grammar));
            verify(grammarRepository, never()).save(any());
            verifyNoInteractions(cloudinaryService);
        }
    }

    // UTCID16: Upload video mới; lưu URL, public ID và làm tròn thời lượng lên giây.
    @Test
    @DisplayName("UTCID16: map upload metadata and ceil duration")
    void updateReplacesVideoAndRoundsDuration() {
        for (Arguments testCase : durations().toList()) {
            resetScenario();
            Object[] data = testCase.get();
            Double duration = (Double) data[0];
            Integer expected = (Integer) data[1];
            prepareUpload("new-video", duration);
            var result = service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            assertAll(() -> assertEquals("https://example.test/new.mp4", result.videoUrl()),
                    () -> assertEquals("new-video", result.videoPublicId()),
                    () -> assertEquals(expected, result.videoDurationSec()),
                    () -> assertEquals(responseOf(grammar), result));
            verify(cloudinaryService).uploadGrammarVideo(videoFile);
            verify(grammarRepository).save(grammar);
            verify(cloudinaryService, never()).deleteVideo(anyString());
        }
    }

    // UTCID17: File video không hợp lệ; trả 400 và không lưu.
    @Test
    @DisplayName("UTCID17: upload validation error becomes 400 with original cause")
    void updateMapsUploadValidationFailure() {
        foundGrammar();
        var cause = new IllegalArgumentException("Unsupported video file type");
        when(cloudinaryService.uploadGrammarVideo(videoFile)).thenThrow(cause);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.update(GRAMMAR_ID, updateRequest(texts()), videoFile));
        assertAll(() -> assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode()),
                () -> assertEquals(cause.getMessage(), error.getReason()), () -> assertSame(cause, error.getCause()));
        verify(grammarRepository, never()).save(any());
        verify(cloudinaryService, never()).deleteVideo(anyString());
    }

    // UTCID18: Upload video gặp lỗi hệ thống; trả 502 và không lưu.
    @Test
    @DisplayName("UTCID18: upload infrastructure error becomes 502")
    void updateMapsUploadFailure() {
        foundGrammar();
        var cause = new IllegalStateException("Cloudinary unavailable");
        when(cloudinaryService.uploadGrammarVideo(videoFile)).thenThrow(cause);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.update(GRAMMAR_ID, updateRequest(texts()), videoFile));
        assertAll(() -> assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode()),
                () -> assertEquals("Video upload failed", error.getReason()), () -> assertSame(cause, error.getCause()));
        verify(grammarRepository, never()).save(any());
    }

    // UTCID19: Chỉ xóa video cũ sau khi giao dịch cập nhật thành công.
    @Test
    @DisplayName("UTCID19: delete only the old video after commit")
    void updateDeletesOldVideoOnlyAfterCommit() {
        prepareUpload("new-video", 12.0);
        service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
        verify(cloudinaryService, never()).deleteVideo(anyString());
        completeTransaction(true);
        verify(cloudinaryService).deleteVideo("old-video");
        verify(cloudinaryService, never()).deleteVideo("new-video");
    }

    // UTCID20: Không xóa video cũ khi public ID cũ thiếu hoặc chỉ có khoảng trắng.
    @Test
    @DisplayName("UTCID20: no old-video deletion for absent public ID")
    void updateSkipsAbsentOldVideo() {
        for (String item : Stream.<String>of(null, "", " ", "\t\n").toList()) {
            resetScenario();
            String previousId = item;
            grammar.setVideoPublicId(previousId);
            prepareUpload("new-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            completeTransaction(true);
            verify(cloudinaryService, never()).deleteVideo(any());
        }
    }

    // UTCID21: Không xóa video khi public ID mới trùng public ID cũ.
    @Test
    @DisplayName("UTCID21: never delete an unchanged public ID after commit")
    void updateKeepsSamePublicId() {
        prepareUpload("old-video", 12.0);
        service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
        completeTransaction(true);
        verify(cloudinaryService, never()).deleteVideo(any());
    }

    // UTCID22: Giao dịch rollback; xóa video mới và giữ video cũ.
    @Test
    @DisplayName("UTCID22: rollback deletes new video and keeps old video")
    void updateCleansNewVideoOnRollback() {
        prepareUpload("new-video", 12.0);
        service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
        completeTransaction(false);
        verify(cloudinaryService).deleteVideo("new-video");
        verify(cloudinaryService, never()).deleteVideo("old-video");
    }

    // UTCID23: Lưu database thất bại sau upload; rollback và xóa video mới.
    @Test
    @DisplayName("UTCID23: save failure propagates and rollback cleans uploaded video")
    void updateCleansVideoAfterSaveFailure() {
        foundGrammar();
        when(cloudinaryService.uploadGrammarVideo(videoFile)).thenReturn(upload("new-video", 12.0));
        var failure = new DataIntegrityViolationException("save failed");
        when(grammarRepository.save(grammar)).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                () -> service.update(GRAMMAR_ID, updateRequest(texts()), videoFile)));
        verify(cloudinaryService, never()).deleteVideo(anyString());
        completeTransaction(false);
        verify(cloudinaryService).deleteVideo("new-video");
        verify(cloudinaryService, never()).deleteVideo("old-video");
    }

    // UTCID24: Xóa video mới khi rollback thất bại; callback không phát sinh thêm lỗi.
    @Test
    @DisplayName("UTCID24: rollback cleanup failure does not escape callback")
    void updateToleratesRollbackCleanupFailure() {
        prepareUpload("new-video", 12.0);
        service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
        doThrow(new IllegalStateException("cleanup failed")).when(cloudinaryService).deleteVideo("new-video");
        assertDoesNotThrow(() -> completeTransaction(false));
        verify(cloudinaryService).deleteVideo("new-video");
        verify(cloudinaryService, never()).deleteVideo("old-video");
    }

    // UTCID25: Xóa video cũ sau commit thất bại; callback không phát sinh thêm lỗi.
    @Test
    @DisplayName("UTCID25: old-video cleanup failure does not escape commit callback")
    void updateToleratesCommitCleanupFailure() {
        prepareUpload("new-video", 12.0);
        service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
        doThrow(new IllegalStateException("cleanup failed")).when(cloudinaryService).deleteVideo("old-video");
        assertDoesNotThrow(() -> completeTransaction(true));
        verify(cloudinaryService).deleteVideo("old-video");
        verify(cloudinaryService, never()).deleteVideo("new-video");
    }

    // UTCID26: Lưu thất bại khi không upload; không gọi Cloudinary.
    @Test
    @DisplayName("UTCID26: save failure without upload never calls Cloudinary")
    void updatePropagatesSaveFailureWithoutVideo() {
        foundGrammar();
        var failure = new DataIntegrityViolationException("save failed");
        when(grammarRepository.save(grammar)).thenThrow(failure);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                () -> service.update(GRAMMAR_ID, updateRequest(texts()), null)));
        verifyNoInteractions(cloudinaryService);
    }

    @Test
    @DisplayName("UTCID27: absent grammar returns false without deletion")
    void deleteReturnsFalseWhenMissing() {
        when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.empty());
        assertFalse(service.delete(GRAMMAR_ID));
        verify(grammarRepository).findById(GRAMMAR_ID);
        verifyNoMoreInteractions(grammarRepository);
        verifyNoInteractions(cloudinaryService);
    }

    @Test
    @DisplayName("UTCID28: delete progress, detach sessions, then delete grammar")
    void deleteDeletesRelatedDataInOrder() {
        foundGrammar();
        assertTrue(service.delete(GRAMMAR_ID));
        var order = inOrder(grammarRepository);
        order.verify(grammarRepository).findById(GRAMMAR_ID);
        order.verify(grammarRepository).deleteLearningProgressByGrammarId(GRAMMAR_ID);
        order.verify(grammarRepository).detachStudySessionsByGrammarId(GRAMMAR_ID);
        order.verify(grammarRepository).delete(grammar);
        order.verifyNoMoreInteractions();
    }

    @Test
    @DisplayName("UTCID29: no video callback for absent or blank public ID")
    void deleteSkipsAbsentVideo() {
        for (String item : Stream.<String>of(null, "", " ", "\t\n").toList()) {
            resetScenario();
            String publicId = item;
            grammar.setVideoPublicId(publicId);
            foundGrammar();
            assertTrue(service.delete(GRAMMAR_ID));
            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
            verifyNoInteractions(cloudinaryService);
        }
    }

    @Test
    @DisplayName("UTCID30: rollback keeps the video")
    void deleteKeepsVideoOnRollback() {
        foundGrammar();
        assertTrue(service.delete(GRAMMAR_ID));
        completeTransaction(false);
        verifyNoInteractions(cloudinaryService);
    }

    @Test
    @DisplayName("UTCID31: grammar deletion failure does not delete video")
    void deleteKeepsVideoAfterDeleteFailure() {
        foundGrammar();
        var failure = new DataIntegrityViolationException("delete failed");
        doThrow(failure).when(grammarRepository).delete(grammar);
        assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.delete(GRAMMAR_ID)));
        verify(grammarRepository).deleteLearningProgressByGrammarId(GRAMMAR_ID);
        verify(grammarRepository).detachStudySessionsByGrammarId(GRAMMAR_ID);
        verifyNoInteractions(cloudinaryService);
        assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
    }

    @Test
    @DisplayName("UTCID32: video cleanup failure does not escape commit callback")
    void deleteToleratesVideoCleanupFailure() {
        foundGrammar();
        assertTrue(service.delete(GRAMMAR_ID));
        doThrow(new IllegalStateException("cleanup failed")).when(cloudinaryService).deleteVideo("old-video");
        assertDoesNotThrow(() -> completeTransaction(true));
        verify(cloudinaryService).deleteVideo("old-video");
    }

    private void resetScenario() {
        tearDown();
        reset(grammarRepository, lessonRepository, cloudinaryService, videoFile);
        setUp();
    }

    private void foundLesson() {
        when(lessonRepository.findById(LESSON_ID)).thenReturn(Optional.of(lesson));
    }

    private void foundGrammar() {
        when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.of(grammar));
    }

    private void saveReturnsArgument() {
        when(grammarRepository.save(any(Grammar.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void prepareRejectedCreate() {
        // Lenient because a compliant implementation may validate before repository access.
        // Returning the entity prevents a mock-induced NPE from concealing invalid acceptance.
        lenient().when(lessonRepository.findById(LESSON_ID)).thenReturn(Optional.of(lesson));
        lenient().when(grammarRepository.save(any(Grammar.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private void prepareRejectedUpdate() {
        lenient().when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.of(grammar));
        lenient().when(grammarRepository.save(any(Grammar.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(cloudinaryService.uploadGrammarVideo(videoFile)).thenReturn(upload("new-video", 12.0));
    }

    private void prepareUpload(String publicId, Double duration) {
        foundGrammar();
        saveReturnsArgument();
        when(cloudinaryService.uploadGrammarVideo(videoFile)).thenReturn(upload(publicId, duration));
    }

    private static CloudinaryUploadResponse upload(String publicId, Double duration) {
        return new CloudinaryUploadResponse("https://example.test/new.mp4", publicId,
                "video", "mp4", duration, 1280, 720, "https://example.test/thumb.jpg");
    }

    private static void completeTransaction(boolean commit) {
        var callbacks = TransactionSynchronizationManager.getSynchronizations();
        if (commit) callbacks.forEach(TransactionSynchronization::afterCommit);
        callbacks.forEach(callback -> callback.afterCompletion(commit
                ? TransactionSynchronization.STATUS_COMMITTED : TransactionSynchronization.STATUS_ROLLED_BACK));
    }

    private static void assertHttp(HttpStatus status, String reason, Executable action) {
        var exception = assertThrows(ResponseStatusException.class, action);
        assertAll(() -> assertEquals(status, exception.getStatusCode()),
                () -> assertEquals(reason, exception.getReason()));
    }

    private static void assertBadRequest(Executable action) {
        var exception = assertThrows(ResponseStatusException.class, action);
        assertAll(() -> assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode()),
                () -> assertNotNull(exception.getReason()),
                () -> assertFalse(exception.getReason() == null || exception.getReason().isBlank()));
    }

    private static String[] texts() {
        return new String[]{"new structure", "new meaning", "new usage", "new example JP", "new example VI"};
    }

    private static List<String> textValues(Grammar grammar) {
        return Arrays.asList(grammar.getStructureName(), grammar.getMeaningVi(), grammar.getUsageExplanation(),
                grammar.getExampleJp(), grammar.getExampleVi());
    }

    private static GrammarCreateRequest createRequest(String[] values) {
        return createRequest(values, null, null, null, Grammar.Status.DRAFT);
    }

    private static GrammarCreateRequest createRequest(String[] values, String url, String publicId,
                                                      Integer duration, Grammar.Status status) {
        return new GrammarCreateRequest(values[0], values[1], values[2], values[3], values[4],
                url, publicId, duration, 1, status);
    }

    private static GrammarUpdateRequest updateRequest(String[] values) {
        return updateRequest(values, null, null, null, Grammar.Status.HIDDEN);
    }

    private static GrammarUpdateRequest updateRequest(String[] values, String url, String publicId,
                                                      Integer duration, Grammar.Status status) {
        return new GrammarUpdateRequest(values[0], values[1], values[2], values[3], values[4],
                url, publicId, duration, 1, status);
    }

    private static GrammarDetailResponse responseOf(Grammar grammar) {
        return new GrammarDetailResponse(grammar.getId(), grammar.getLesson().getId(), grammar.getStructureName(),
                grammar.getMeaningVi(), grammar.getUsageExplanation(), grammar.getExampleJp(), grammar.getExampleVi(),
                grammar.getVideoUrl(), grammar.getVideoPublicId(), grammar.getVideoDurationSec(), grammar.getDisplayOrder(),
                grammar.getStatus(), grammar.getCreatedAt(), grammar.getUpdatedAt());
    }

    static Stream<Arguments> invalidText() {
        return Arrays.stream(TextField.values()).flatMap(field -> Stream.of(
                Arguments.of(field, "null", null), Arguments.of(field, "empty", ""),
                Arguments.of(field, "spaces", "   "), Arguments.of(field, "tab/newline", "\t\r\n"),
                Arguments.of(field, "101 characters", "a".repeat(101))));
    }

    static Stream<Arguments> validText() {
        return Arrays.stream(TextField.values()).flatMap(field -> {
            String content = "a".repeat(100);
            return Stream.of(Arguments.of(field, "100 characters", content, content),
                    Arguments.of(field, "trimmed 100 characters", " \t" + content + "\r\n ", content));
        });
    }

    static Stream<Arguments> defaults() {
        return Stream.of(Arguments.of(null, Grammar.Status.DRAFT),
                Arguments.of(Grammar.Status.PUBLISHED, Grammar.Status.PUBLISHED));
    }

    static Stream<Arguments> incompleteVideo() {
        return Stream.of(null, "", " ").flatMap(absent -> Stream.of(
                Arguments.of("URL only; ID=" + absent, "https://example.test/video.mp4", absent),
                Arguments.of("ID only; URL=" + absent, absent, "video-id")));
    }

    static Stream<Arguments> absentVideoPairs() {
        return Stream.of(null, "", " ").flatMap(url -> Stream.of(null, "", " ")
                .map(publicId -> Arguments.of(url, publicId)));
    }

    static Stream<Arguments> replacementMetadata() {
        return Stream.of(false, true).flatMap(withFile -> Stream.of(
                Arguments.of("https://example.test/new.mp4", null, withFile),
                Arguments.of(null, "new-video", withFile),
                Arguments.of("https://example.test/new.mp4", "new-video", withFile)));
    }

    static Stream<Arguments> durations() {
        return Stream.of(Arguments.of(null, null), Arguments.of(0.0, 0),
                Arguments.of(12.0, 12), Arguments.of(12.1, 13));
    }
}
