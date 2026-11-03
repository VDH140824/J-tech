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
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
 * text <= 100 characters and displayOrder >= 1. These requirements deliberately
 * remain assertions even when the current production service does not enforce them.
 * Transaction callbacks are simulated; no database or Cloudinary connection is used.
 */
@ExtendWith(MockitoExtension.class)
class GrammarServiceTest {
    private static final long LESSON_ID = 10L;
    private static final long GRAMMAR_ID = 20L;
    private static final LocalDateTime CREATED = LocalDateTime.of(2026, 1, 1, 8, 0);
    private static final LocalDateTime UPDATED = LocalDateTime.of(2026, 1, 2, 9, 0);

    @Mock GrammarRepository grammarRepository;
    @Mock LessonRepository lessonRepository;
    @Mock CloudinaryService cloudinaryService;
    @Mock MultipartFile videoFile;
    @InjectMocks GrammarService service;

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
                .videoDurationSec(30).displayOrder(2).status(Grammar.Status.PUBLISHED)
                .createdAt(CREATED).updatedAt(UPDATED).build();
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Nested
    @DisplayName("getById(Long id)")
    class GetById {
        @Test
        @DisplayName("G-ID-01: map all response fields")
        void mapsAllFields() {
            foundGrammar();
            assertEquals(responseOf(grammar), service.getById(GRAMMAR_ID));
            verify(grammarRepository).findById(GRAMMAR_ID);
        }

        @Test
        @DisplayName("G-ID-02: null video fields remain null")
        void mapsAbsentVideo() {
            grammar.setVideoUrl(null);
            grammar.setVideoPublicId(null);
            grammar.setVideoDurationSec(null);
            foundGrammar();
            assertEquals(responseOf(grammar), service.getById(GRAMMAR_ID));
        }

        @Test
        @DisplayName("G-ID-03: missing grammar returns 404")
        void rejectsMissingGrammar() {
            when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.empty());
            assertHttp(HttpStatus.NOT_FOUND, "Grammar not found", () -> service.getById(GRAMMAR_ID));
        }
    }

    @Nested
    @DisplayName("getByLesson(Long lessonId, Grammar.Status status)")
    class GetByLesson {
        @Test
        @DisplayName("G-LIST-01: null status selects the unfiltered repository query")
        void queriesWithoutStatus() {
            when(lessonRepository.existsById(LESSON_ID)).thenReturn(true);
            when(grammarRepository.findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID))
                    .thenReturn(List.of(grammar));
            assertEquals(List.of(responseOf(grammar)), service.getByLesson(LESSON_ID, null));
            verify(grammarRepository).findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID);
            verify(grammarRepository, never()).findByLessonIdAndStatusOrderByDisplayOrderAscIdAsc(anyLong(), any());
        }

        @ParameterizedTest
        @EnumSource(Grammar.Status.class)
        @DisplayName("G-LIST-02: filter by each requested status")
        void queriesEachStatus(Grammar.Status status) {
            grammar.setStatus(status);
            when(lessonRepository.existsById(LESSON_ID)).thenReturn(true);
            when(grammarRepository.findByLessonIdAndStatusOrderByDisplayOrderAscIdAsc(LESSON_ID, status))
                    .thenReturn(List.of(grammar));
            assertEquals(List.of(responseOf(grammar)), service.getByLesson(LESSON_ID, status));
            verify(grammarRepository).findByLessonIdAndStatusOrderByDisplayOrderAscIdAsc(LESSON_ID, status);
            verify(grammarRepository, never()).findByLessonIdOrderByDisplayOrderAscIdAsc(anyLong());
        }

        @Test
        @DisplayName("G-LIST-03: empty repository result returns an empty list")
        void returnsEmptyList() {
            when(lessonRepository.existsById(LESSON_ID)).thenReturn(true);
            when(grammarRepository.findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID)).thenReturn(List.of());
            assertTrue(service.getByLesson(LESSON_ID, null).isEmpty());
        }

        @Test
        @DisplayName("G-LIST-04: map multiple grammars without changing repository order")
        void preservesRepositoryOrder() {
            Grammar second = Grammar.builder().id(21L).lesson(lesson).structureName("second")
                    .meaningVi("meaning").usageExplanation("usage").exampleJp("JP").exampleVi("VI")
                    .displayOrder(3).status(Grammar.Status.HIDDEN).createdAt(CREATED).build();
            when(lessonRepository.existsById(LESSON_ID)).thenReturn(true);
            when(grammarRepository.findByLessonIdOrderByDisplayOrderAscIdAsc(LESSON_ID))
                    .thenReturn(List.of(grammar, second));
            assertEquals(List.of(responseOf(grammar), responseOf(second)), service.getByLesson(LESSON_ID, null));
        }
    }

    @Nested
    @DisplayName("create(Long lessonId, GrammarCreateRequest request)")
    class Create {
        @Test
        @DisplayName("G-CREATE-01: save all request fields and map the persisted entity")
        void savesAndMapsAllFields() {
            foundLesson();
            when(grammarRepository.save(any(Grammar.class))).thenAnswer(invocation -> {
                Grammar saved = invocation.getArgument(0);
                saved.setId(77L);
                saved.setCreatedAt(CREATED);
                return saved;
            });
            GrammarDetailResponse result = service.create(LESSON_ID,
                    createRequest(texts(), "https://example.test/new.mp4", "new-video", 14, 3, Grammar.Status.HIDDEN));
            ArgumentCaptor<Grammar> captured = ArgumentCaptor.forClass(Grammar.class);
            verify(grammarRepository).save(captured.capture());
            Grammar saved = captured.getValue();
            assertAll(() -> assertSame(lesson, saved.getLesson()),
                    () -> assertEquals(List.of(texts()), textValues(saved)),
                    () -> assertEquals("https://example.test/new.mp4", saved.getVideoUrl()),
                    () -> assertEquals("new-video", saved.getVideoPublicId()),
                    () -> assertEquals(14, saved.getVideoDurationSec()),
                    () -> assertEquals(3, saved.getDisplayOrder()),
                    () -> assertEquals(Grammar.Status.HIDDEN, saved.getStatus()),
                    () -> assertEquals(77L, result.id()),
                    () -> assertEquals(responseOf(saved), result));
            verifyNoInteractions(cloudinaryService);
        }

        @ParameterizedTest
        @MethodSource("com.jtech.service.GrammarServiceTest#defaults")
        @DisplayName("G-CREATE-02: omitted order defaults to 1 and omitted status to DRAFT")
        void appliesDefaults(Integer order, Grammar.Status status, int expectedOrder, Grammar.Status expectedStatus) {
            foundLesson();
            saveReturnsArgument();
            var result = service.create(LESSON_ID, createRequest(texts(), null, null, null, order, status));
            assertAll(() -> assertEquals(expectedOrder, result.displayOrder()),
                    () -> assertEquals(expectedStatus, result.status()));
        }

        @ParameterizedTest
        @EnumSource(Grammar.Status.class)
        @DisplayName("G-CREATE-03: preserve the explicitly requested status and order")
        void preservesExplicitDefaults(Grammar.Status status) {
            foundLesson();
            saveReturnsArgument();
            var result = service.create(LESSON_ID, createRequest(texts(), null, null, null, 7, status));
            assertAll(() -> assertEquals(7, result.displayOrder()), () -> assertEquals(status, result.status()));
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.GrammarServiceTest#invalidText")
        @DisplayName("G-CREATE-04/05/06/08: reject null, empty, blank and 101-character text")
        void rejectsInvalidText(TextField field, String scenario, String value) {
            prepareRejectedCreate();
            String[] values = texts();
            values[field.ordinal()] = value;
            assertAll(() -> assertBadRequest(() -> service.create(LESSON_ID, createRequest(values))),
                    () -> verify(grammarRepository, never()).save(any()),
                    () -> verifyNoInteractions(cloudinaryService));
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.GrammarServiceTest#validText")
        @DisplayName("G-CREATE-07/09: accept 100 characters and trim surrounding whitespace")
        void acceptsBoundaryAndTrims(TextField field, String scenario, String value, String expected) {
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

        @ParameterizedTest
        @ValueSource(ints = {-1, 0})
        @DisplayName("G-CREATE-10: reject negative or zero display order")
        void rejectsOrderBelowOne(int order) {
            prepareRejectedCreate();
            assertAll(() -> assertBadRequest(() -> service.create(LESSON_ID,
                            createRequest(texts(), null, null, null, order, Grammar.Status.DRAFT))),
                    () -> verify(grammarRepository, never()).save(any()),
                    () -> verifyNoInteractions(cloudinaryService));
        }

        @ParameterizedTest
        @ValueSource(ints = {1, 3})
        @DisplayName("G-CREATE-11: accept display order 1 and a larger valid order")
        void acceptsPositiveOrder(int order) {
            foundLesson();
            saveReturnsArgument();
            assertEquals(order, service.create(LESSON_ID,
                    createRequest(texts(), null, null, null, order, Grammar.Status.DRAFT)).displayOrder());
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("com.jtech.service.GrammarServiceTest#incompleteVideo")
        @DisplayName("G-CREATE-12/13: URL and public ID must be supplied together")
        void rejectsIncompleteVideo(String scenario, String url, String publicId) {
            foundLesson();
            assertHttp(HttpStatus.BAD_REQUEST, "Video URL and public ID must be provided together",
                    () -> service.create(LESSON_ID, createRequest(texts(), url, publicId, null, 1, Grammar.Status.DRAFT)));
            verify(grammarRepository, never()).save(any());
            verifyNoInteractions(cloudinaryService);
        }

        @ParameterizedTest
        @MethodSource("com.jtech.service.GrammarServiceTest#absentVideoPairs")
        @DisplayName("G-CREATE-14: both video fields absent or blank are allowed")
        void acceptsAbsentVideo(String url, String publicId) {
            foundLesson();
            saveReturnsArgument();
            var result = service.create(LESSON_ID, createRequest(texts(), url, publicId, null, 1, Grammar.Status.DRAFT));
            assertAll(() -> assertEquals(url, result.videoUrl()), () -> assertEquals(publicId, result.videoPublicId()),
                    () -> assertNull(result.videoDurationSec()));
            verifyNoInteractions(cloudinaryService);
        }

        @Test
        @DisplayName("G-CREATE-15: propagate repository save failure")
        void propagatesSaveFailure() {
            foundLesson();
            var error = new DataIntegrityViolationException("save failed");
            when(grammarRepository.save(any())).thenThrow(error);
            assertSame(error, assertThrows(DataIntegrityViolationException.class,
                    () -> service.create(LESSON_ID, createRequest(texts()))));
            verifyNoInteractions(cloudinaryService);
        }
    }

    @Nested
    @DisplayName("update(Long id, GrammarUpdateRequest request, MultipartFile videoFile)")
    class Update {
        @Test
        @DisplayName("G-UPDATE-01: missing grammar returns 404")
        void rejectsMissingGrammar() {
            when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.empty());
            assertHttp(HttpStatus.NOT_FOUND, "Grammar not found",
                    () -> service.update(GRAMMAR_ID, updateRequest(texts()), videoFile));
            verify(grammarRepository, never()).save(any());
            verifyNoInteractions(cloudinaryService);
        }

        @Test
        @DisplayName("G-UPDATE-02/03: update text and retain video metadata without a new file")
        void updatesTextAndKeepsVideo() {
            foundGrammar();
            saveReturnsArgument();
            var result = service.update(GRAMMAR_ID,
                    updateRequest(new String[]{" new structure ", " new meaning ", " new usage ", " new JP ", " new VI "},
                            null, null, 999, 4, Grammar.Status.HIDDEN), null);
            assertAll(() -> assertEquals(List.of("new structure", "new meaning", "new usage", "new JP", "new VI"), textValues(grammar)),
                    () -> assertEquals(4, grammar.getDisplayOrder()),
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

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.GrammarServiceTest#invalidText")
        @DisplayName("G-UPDATE-04/05/06/08: reject invalid text before mutation, upload or save")
        void rejectsInvalidTextWithoutSideEffects(TextField field, String scenario, String value) {
            prepareRejectedUpdate();
            var before = responseOf(grammar);
            String[] values = texts();
            values[field.ordinal()] = value;
            assertAll(() -> assertBadRequest(() -> service.update(GRAMMAR_ID, updateRequest(values), videoFile)),
                    () -> assertEquals(before, responseOf(grammar), "Rejected updates must not mutate the entity"),
                    () -> verify(grammarRepository, never()).save(any()),
                    () -> verifyNoInteractions(cloudinaryService));
        }

        @ParameterizedTest(name = "{0}: {1}")
        @MethodSource("com.jtech.service.GrammarServiceTest#validText")
        @DisplayName("G-UPDATE-07/09: accept 100 characters and trim surrounding whitespace")
        void acceptsBoundaryAndTrims(TextField field, String scenario, String value, String expected) {
            foundGrammar();
            saveReturnsArgument();
            String[] values = texts();
            values[field.ordinal()] = value;
            var result = service.update(GRAMMAR_ID, updateRequest(values), null);
            assertAll(() -> assertEquals(expected, textValues(grammar).get(field.ordinal())),
                    () -> assertEquals(responseOf(grammar), result));
            verifyNoInteractions(cloudinaryService);
        }

        @ParameterizedTest
        @ValueSource(ints = {-1, 0})
        @DisplayName("G-UPDATE-10: reject display order below 1 without side effects")
        void rejectsOrderBelowOne(int order) {
            prepareRejectedUpdate();
            var before = responseOf(grammar);
            assertAll(() -> assertBadRequest(() -> service.update(GRAMMAR_ID,
                            updateRequest(texts(), null, null, null, order, Grammar.Status.HIDDEN), videoFile)),
                    () -> assertEquals(before, responseOf(grammar)),
                    () -> verify(grammarRepository, never()).save(any()),
                    () -> verifyNoInteractions(cloudinaryService));
        }

        @ParameterizedTest
        @ValueSource(ints = {1, 3})
        @DisplayName("G-UPDATE-11: accept display order 1 and a larger valid order")
        void acceptsPositiveOrder(int order) {
            foundGrammar();
            saveReturnsArgument();
            assertEquals(order, service.update(GRAMMAR_ID,
                    updateRequest(texts(), null, null, null, order, Grammar.Status.HIDDEN), null).displayOrder());
        }

        @ParameterizedTest
        @MethodSource("com.jtech.service.GrammarServiceTest#replacementMetadata")
        @DisplayName("G-UPDATE-12: reject replacement URL/public ID even when a file is supplied")
        void rejectsReplacementMetadata(String url, String publicId, boolean withFile) {
            foundGrammar();
            var before = responseOf(grammar);
            assertHttp(HttpStatus.BAD_REQUEST, "Video replacement requires a video file",
                    () -> service.update(GRAMMAR_ID,
                            updateRequest(texts(), url, publicId, null, 1, Grammar.Status.DRAFT), withFile ? videoFile : null));
            assertEquals(before, responseOf(grammar));
            verify(grammarRepository, never()).save(any());
            verifyNoInteractions(cloudinaryService);
        }

        @ParameterizedTest
        @MethodSource("com.jtech.service.GrammarServiceTest#durations")
        @DisplayName("G-UPDATE-13/14: map upload metadata and ceil duration")
        void replacesVideoAndRoundsDuration(Double duration, Integer expected) {
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

        @Test
        @DisplayName("G-UPDATE-15: upload validation error becomes 400 with original cause")
        void mapsUploadValidationFailure() {
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

        @Test
        @DisplayName("G-UPDATE-16: upload infrastructure error becomes 502")
        void mapsUploadFailure() {
            foundGrammar();
            var cause = new IllegalStateException("Cloudinary unavailable");
            when(cloudinaryService.uploadGrammarVideo(videoFile)).thenThrow(cause);
            var error = assertThrows(ResponseStatusException.class,
                    () -> service.update(GRAMMAR_ID, updateRequest(texts()), videoFile));
            assertAll(() -> assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode()),
                    () -> assertEquals("Video upload failed", error.getReason()), () -> assertSame(cause, error.getCause()));
            verify(grammarRepository, never()).save(any());
        }

        @Test
        @DisplayName("G-UPDATE-17/18: delete only the old video after commit")
        void deletesOldVideoOnlyAfterCommit() {
            prepareUpload("new-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            verify(cloudinaryService, never()).deleteVideo(anyString());
            completeTransaction(true);
            verify(cloudinaryService).deleteVideo("old-video");
            verify(cloudinaryService, never()).deleteVideo("new-video");
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {" ", "\t\n"})
        @DisplayName("G-UPDATE-19: no old-video deletion for absent public ID")
        void skipsAbsentOldVideo(String previousId) {
            grammar.setVideoPublicId(previousId);
            prepareUpload("new-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            completeTransaction(true);
            verify(cloudinaryService, never()).deleteVideo(any());
        }

        @Test
        @DisplayName("G-UPDATE-20: never delete an unchanged public ID after commit")
        void keepsSamePublicId() {
            prepareUpload("old-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            completeTransaction(true);
            verify(cloudinaryService, never()).deleteVideo(any());
        }

        @Test
        @DisplayName("G-UPDATE-21: rollback deletes new video and keeps old video")
        void cleansNewVideoOnRollback() {
            prepareUpload("new-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            completeTransaction(false);
            verify(cloudinaryService).deleteVideo("new-video");
            verify(cloudinaryService, never()).deleteVideo("old-video");
        }

        @Test
        @DisplayName("G-UPDATE-22: save failure propagates and rollback cleans uploaded video")
        void cleansVideoAfterSaveFailure() {
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

        @Test
        @DisplayName("G-UPDATE-23: rollback cleanup failure does not escape callback")
        void toleratesRollbackCleanupFailure() {
            prepareUpload("new-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            doThrow(new IllegalStateException("cleanup failed")).when(cloudinaryService).deleteVideo("new-video");
            assertDoesNotThrow(() -> completeTransaction(false));
            verify(cloudinaryService).deleteVideo("new-video");
            verify(cloudinaryService, never()).deleteVideo("old-video");
        }

        @Test
        @DisplayName("G-UPDATE-24: old-video cleanup failure does not escape commit callback")
        void toleratesCommitCleanupFailure() {
            prepareUpload("new-video", 12.0);
            service.update(GRAMMAR_ID, updateRequest(texts()), videoFile);
            doThrow(new IllegalStateException("cleanup failed")).when(cloudinaryService).deleteVideo("old-video");
            assertDoesNotThrow(() -> completeTransaction(true));
            verify(cloudinaryService).deleteVideo("old-video");
            verify(cloudinaryService, never()).deleteVideo("new-video");
        }

        @Test
        @DisplayName("G-UPDATE-25: save failure without upload never calls Cloudinary")
        void propagatesSaveFailureWithoutVideo() {
            foundGrammar();
            var failure = new DataIntegrityViolationException("save failed");
            when(grammarRepository.save(grammar)).thenThrow(failure);
            assertSame(failure, assertThrows(DataIntegrityViolationException.class,
                    () -> service.update(GRAMMAR_ID, updateRequest(texts()), null)));
            verifyNoInteractions(cloudinaryService);
        }
    }

    @Nested
    @DisplayName("delete(Long id)")
    class Delete {
        @Test
        @DisplayName("G-DELETE-01: absent grammar returns false without deletion")
        void returnsFalseWhenMissing() {
            when(grammarRepository.findById(GRAMMAR_ID)).thenReturn(Optional.empty());
            assertFalse(service.delete(GRAMMAR_ID));
            verify(grammarRepository).findById(GRAMMAR_ID);
            verifyNoMoreInteractions(grammarRepository);
            verifyNoInteractions(cloudinaryService);
        }

        @Test
        @DisplayName("G-DELETE-02: delete progress, detach sessions, then delete grammar")
        void deletesRelatedDataInOrder() {
            foundGrammar();
            assertTrue(service.delete(GRAMMAR_ID));
            var order = inOrder(grammarRepository);
            order.verify(grammarRepository).findById(GRAMMAR_ID);
            order.verify(grammarRepository).deleteLearningProgressByGrammarId(GRAMMAR_ID);
            order.verify(grammarRepository).detachStudySessionsByGrammarId(GRAMMAR_ID);
            order.verify(grammarRepository).delete(grammar);
            order.verifyNoMoreInteractions();
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {" ", "\t\n"})
        @DisplayName("G-DELETE-03: no video callback for absent or blank public ID")
        void skipsAbsentVideo(String publicId) {
            grammar.setVideoPublicId(publicId);
            foundGrammar();
            assertTrue(service.delete(GRAMMAR_ID));
            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
            verifyNoInteractions(cloudinaryService);
        }

        @Test
        @DisplayName("G-DELETE-04/05: delete video only after commit")
        void deletesVideoOnlyAfterCommit() {
            foundGrammar();
            assertTrue(service.delete(GRAMMAR_ID));
            verifyNoInteractions(cloudinaryService);
            completeTransaction(true);
            verify(cloudinaryService).deleteVideo("old-video");
            verifyNoMoreInteractions(cloudinaryService);
        }

        @Test
        @DisplayName("G-DELETE-06: rollback keeps the video")
        void keepsVideoOnRollback() {
            foundGrammar();
            assertTrue(service.delete(GRAMMAR_ID));
            completeTransaction(false);
            verifyNoInteractions(cloudinaryService);
        }

        @Test
        @DisplayName("G-DELETE-07: progress deletion failure stops remaining actions")
        void stopsAfterProgressFailure() {
            foundGrammar();
            var failure = new DataIntegrityViolationException("progress delete failed");
            when(grammarRepository.deleteLearningProgressByGrammarId(GRAMMAR_ID)).thenThrow(failure);
            assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.delete(GRAMMAR_ID)));
            verify(grammarRepository, never()).detachStudySessionsByGrammarId(anyLong());
            verify(grammarRepository, never()).delete(any());
            verifyNoInteractions(cloudinaryService);
            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
        }

        @Test
        @DisplayName("G-DELETE-08: session detachment failure stops grammar deletion")
        void stopsAfterDetachFailure() {
            foundGrammar();
            var failure = new DataIntegrityViolationException("detach failed");
            when(grammarRepository.detachStudySessionsByGrammarId(GRAMMAR_ID)).thenThrow(failure);
            assertSame(failure, assertThrows(DataIntegrityViolationException.class, () -> service.delete(GRAMMAR_ID)));
            verify(grammarRepository).deleteLearningProgressByGrammarId(GRAMMAR_ID);
            verify(grammarRepository, never()).delete(any());
            verifyNoInteractions(cloudinaryService);
            assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
        }

        @Test
        @DisplayName("G-DELETE-09: grammar deletion failure does not delete video")
        void keepsVideoAfterDeleteFailure() {
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
        @DisplayName("G-DELETE-10: video cleanup failure does not escape commit callback")
        void toleratesVideoCleanupFailure() {
            foundGrammar();
            assertTrue(service.delete(GRAMMAR_ID));
            doThrow(new IllegalStateException("cleanup failed")).when(cloudinaryService).deleteVideo("old-video");
            assertDoesNotThrow(() -> completeTransaction(true));
            verify(cloudinaryService).deleteVideo("old-video");
        }
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
        return createRequest(values, null, null, null, 1, Grammar.Status.DRAFT);
    }

    private static GrammarCreateRequest createRequest(String[] values, String url, String publicId,
                                                      Integer duration, Integer order, Grammar.Status status) {
        return new GrammarCreateRequest(values[0], values[1], values[2], values[3], values[4],
                url, publicId, duration, order, status);
    }

    private static GrammarUpdateRequest updateRequest(String[] values) {
        return updateRequest(values, null, null, null, 1, Grammar.Status.HIDDEN);
    }

    private static GrammarUpdateRequest updateRequest(String[] values, String url, String publicId,
                                                      Integer duration, Integer order, Grammar.Status status) {
        return new GrammarUpdateRequest(values[0], values[1], values[2], values[3], values[4],
                url, publicId, duration, order, status);
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
                Arguments.of(field, "101 ASCII characters", "a".repeat(101)),
                Arguments.of(field, "101 Vietnamese characters", "ế".repeat(101)),
                Arguments.of(field, "101 Japanese characters", "語".repeat(101))));
    }

    static Stream<Arguments> validText() {
        return Arrays.stream(TextField.values()).flatMap(field -> Stream.of("a", "ế", "語").flatMap(character -> {
            String content = character.repeat(100);
            return Stream.of(Arguments.of(field, "100 x " + character, content, content),
                    Arguments.of(field, "trimmed 100 x " + character, " \t" + content + "\r\n ", content));
        }));
    }

    static Stream<Arguments> defaults() {
        return Stream.of(Arguments.of(null, null, 1, Grammar.Status.DRAFT),
                Arguments.of(null, Grammar.Status.PUBLISHED, 1, Grammar.Status.PUBLISHED),
                Arguments.of(4, null, 4, Grammar.Status.DRAFT));
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
