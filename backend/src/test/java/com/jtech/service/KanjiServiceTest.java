package com.jtech.service;

import com.jtech.dto.request.*;
import com.jtech.entity.*;
import com.jtech.repository.*;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import org.springframework.jdbc.core.JdbcTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class KanjiServiceTest {
    KanjiRepository repository;
    LessonRepository lessons;
    JdbcTemplate jdbc;
    Cloudinary cloudinary;
    Uploader uploader;
    KanjiService service;
    Lesson lesson;
    Kanji kanji;
    KanjiCreateRequest request = new KanjiCreateRequest("日", "Nhật", "ニチ", "ひ", "Mặt trời", null, null, null, null);
    KanjiUpdateRequest updateRequest = new KanjiUpdateRequest("日", "Nhật", "ニチ", "ひ", "Mặt trời", null, null, false, 1, Kanji.Status.DRAFT);
    @BeforeEach void setup() {
        repository = mock(KanjiRepository.class); lessons = mock(LessonRepository.class);
        jdbc = mock(JdbcTemplate.class); cloudinary = mock(Cloudinary.class); uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        try { when(uploader.destroy(anyString(), anyMap())).thenReturn(Map.of("result", "ok")); } catch (java.io.IOException e) { throw new AssertionError(e); }
        service = new KanjiService(repository, lessons, cloudinary, jdbc, new ObjectMapper(), mock(EntityManager.class),
                Validation.buildDefaultValidatorFactory().getValidator());
        lesson = Lesson.builder().id(1L).skillType(Lesson.SkillType.KANJI).status(Course.Status.DRAFT).build();
        kanji = new Kanji(); kanji.setId(2L); kanji.setLesson(lesson); kanji.setCharacterText("日");
        when(lessons.findById(1L)).thenReturn(Optional.of(lesson));
        when(repository.findById(2L)).thenReturn(Optional.of(kanji));
        TransactionSynchronizationManager.initSynchronization();
    }
    @AfterEach void cleanup() { TransactionSynchronizationManager.clearSynchronization(); }
    @Test void createsDraftWithNextOrderAndActor() {
        when(repository.findMaxDisplayOrder(1L)).thenReturn(4);
        when(repository.saveAndFlush(any())).thenAnswer(i -> { Kanji k = i.getArgument(0); k.setId(3L); return k; });
        var result = service.create(9L, 1L, request, null);
        assertEquals(5, result.displayOrder()); assertEquals(Kanji.Status.DRAFT, result.status());
        verify(repository).saveAndFlush(argThat(k -> k.getCreatedBy().equals(9L)));
        verify(jdbc).update(anyString(), eq(9L), eq("KANJI_CREATE"), eq("Kanji"), eq(3L), eq("Created Kanji"));
    }
    @Test void rejectsDuplicateBeforeUpload() {
        when(repository.existsByLessonIdAndCharacterText(1L, "日")).thenReturn(true);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.create(9L, 1L, request, null)).getStatusCode().value());
        verifyNoInteractions(uploader);
    }
    @Test void rejectsInvalidCharacter() {
        var invalid = new KanjiCreateRequest("abc", null, null, null, "Meaning", null, null, null, null);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(9L, 1L, invalid, null)).getStatusCode().value());
    }
    @Test void rejectsMissingMeaning() {
        var invalid = new KanjiCreateRequest("日", null, null, null, " ", null, null, null, null);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(9L, 1L, invalid, null)).getStatusCode().value());
    }
    @Test void missingLessonReturns404() {
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.create(9L, 99L, request, null)).getStatusCode().value());
    }
    @Test void archivedLessonReturns404() {
        lesson.setStatus(Course.Status.ARCHIVED);
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.create(9L, 1L, request, null)).getStatusCode().value());
    }
    @Test void wrongLessonSkillReturns400() {
        lesson.setSkillType(Lesson.SkillType.GRAMMAR);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(9L, 1L, request, null)).getStatusCode().value());
    }
    @Test void rejectsEditingArchivedKanji() {
        kanji.setStatus(Kanji.Status.ARCHIVED);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.update(9L, 2L, updateRequest, null)).getStatusCode().value());
        verify(repository, never()).saveAndFlush(any());
    }
    @Test void rejectsDuplicateOnUpdate() {
        when(repository.existsByLessonIdAndCharacterTextAndIdNot(1L, "日", 2L)).thenReturn(true);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.update(9L, 2L, updateRequest, null)).getStatusCode().value());
    }
    @Test void archivesUsedKanjiAndRetainsImage() {
        when(jdbc.queryForObject(anyString(), eq(Boolean.class), eq(2L), eq(2L), eq(2L))).thenReturn(true);
        assertFalse(service.deleteOrArchive(9L, 2L));
        assertEquals(Kanji.Status.ARCHIVED, kanji.getStatus());
        verify(repository, never()).delete(any(Kanji.class)); verifyNoInteractions(uploader);
    }
    @Test void deletesUnusedKanjiAndCleansImageOnlyAfterCommit() throws Exception {
        kanji.setImagePublicId("old");
        assertTrue(service.deleteOrArchive(9L, 2L));
        verify(repository).delete(kanji); verifyNoInteractions(uploader);
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(uploader).destroy(eq("old"), anyMap());
    }
    @Test void rollbackDeletesNewImageAndKeepsOldImage() throws Exception {
        kanji.setImagePublicId("old");
        var file = new MockMultipartFile("image", "x.png", "image/png", Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII="));
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of("secure_url", "https://example.test/new.png", "public_id", "new"));
        doThrow(new RuntimeException("Database failure")).when(repository).saveAndFlush(any());
        assertThrows(RuntimeException.class, () -> service.update(9L, 2L, updateRequest, file));
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verify(uploader).destroy(eq("new"), anyMap()); verify(uploader, never()).destroy(eq("old"), anyMap());
    }
    @Test void updateWithoutImagePreservesIt() {
        kanji.setImageUrl("https://example.test/old.png"); kanji.setImagePublicId("old");
        assertEquals("https://example.test/old.png", service.update(9L, 2L, updateRequest, null).imageUrl()); verifyNoInteractions(uploader);
    }
    @Test void removalClearsImageAndDeletesAfterCommit() throws Exception {
        kanji.setImagePublicId("old"); kanji.setImageUrl("https://example.test/old.png");
        var removal = new KanjiUpdateRequest("日", null, null, null, "Ngày", null, null, true, 1, Kanji.Status.DRAFT);
        assertNull(service.update(9L, 2L, removal, null).imageUrl()); verifyNoInteractions(uploader);
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        verify(uploader).destroy(eq("old"), anyMap());
    }
    @Test void missingKanjiReturns404() {
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.getDetail(99L)).getStatusCode().value());
    }
    @Test void updateRequiresOrderAndStatusLikeGrammar() {
        var invalid = new KanjiUpdateRequest("日", null, null, null, "Ngày", null, null, false, null, null);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.update(9L, 2L, invalid, null)).getStatusCode().value());
    }
    @Test void updateAppliesOrderAndPublicationStatus() {
        var input = new KanjiUpdateRequest("日", null, null, null, "Ngày", null, null, false, 7, Kanji.Status.PUBLISHED);
        var result = service.update(9L, 2L, input, null);
        assertEquals(7, result.displayOrder());
        assertEquals(Kanji.Status.PUBLISHED, result.status());
    }
    @Test void detailIncludesImageMetadataAndTimestampsLikeGrammar() {
        var timestamp = java.time.LocalDateTime.of(2026, 10, 30, 12, 0);
        kanji.setImagePublicId("kanji/image"); kanji.setCreatedAt(timestamp); kanji.setUpdatedAt(timestamp);
        var result = service.getDetail(2L);
        assertEquals("kanji/image", result.imagePublicId());
        assertEquals(timestamp, result.createdAt()); assertEquals(timestamp, result.updatedAt());
    }
    @Test void listUsesStableOrderAndCapsPageSize() {
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());
        assertTrue(service.listByLesson(1L, null, null, PageRequest.of(0, 200)).isEmpty());
        verify(repository).findAll(any(Specification.class), eq(PageRequest.of(0, 100, Sort.by("displayOrder", "id"))));
    }
}
