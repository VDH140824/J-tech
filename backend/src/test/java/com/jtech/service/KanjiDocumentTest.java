package com.jtech.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class KanjiDocumentTest {
    Cloudinary cloudinary;
    Uploader uploader;
    KanjiService service;
    ObjectMapper mapper = new ObjectMapper();
    @BeforeEach void setup() {
        cloudinary = mock(Cloudinary.class); uploader = mock(Uploader.class);
        when(cloudinary.uploader()).thenReturn(uploader);
        service = new KanjiService(mock(com.jtech.repository.KanjiRepository.class), mock(com.jtech.repository.LessonRepository.class), cloudinary, mock(org.springframework.jdbc.core.JdbcTemplate.class), mapper, mock(jakarta.persistence.EntityManager.class), mock(jakarta.validation.Validator.class));
        TransactionSynchronizationManager.initSynchronization();
    }
    @AfterEach void cleanup() { TransactionSynchronizationManager.clearSynchronization(); }
    @Test void normalizesLinkToJsonWithoutUploading() throws Exception {
        var result = mapper.readTree(service.documents("https://example.test/document.pdf", null));
        assertEquals("https://example.test/document.pdf", result.get(0).get("url").asText());
        verifyNoInteractions(uploader);
    }
    @Test void emptyDocumentsRemainNull() { assertNull(service.documents(" ", null)); }
    @Test void rejectsInvalidLink() {
        assertThrows(ResponseStatusException.class, () -> service.documents("javascript:alert(1)", null));
    }
    @Test void rejectsExecutableAndFakePdf() {
        assertThrows(ResponseStatusException.class, () -> service.validateDocument(new MockMultipartFile("file", "x.exe", "application/octet-stream", new byte[]{1})));
        assertThrows(ResponseStatusException.class, () -> service.validateDocument(new MockMultipartFile("file", "x.pdf", "application/pdf", new byte[]{1})));
    }
    @Test void rejectsEmptyAndOversizedFile() {
        assertThrows(ResponseStatusException.class, () -> service.validateDocument(new MockMultipartFile("file", "x.txt", "text/plain", new byte[0])));
        assertThrows(ResponseStatusException.class, () -> service.validateDocument(new MockMultipartFile("file", "x.txt", "text/plain", new byte[10 * 1024 * 1024 + 1])));
    }
    @Test void acceptsVietnameseAndJapaneseText() {
        assertDoesNotThrow(() -> service.validateDocument(new MockMultipartFile("file", "x.txt", "text/plain", "Chữ Hán 日本".getBytes(StandardCharsets.UTF_8))));
    }
    @Test void uploadsAndPreservesExistingAttachmentsAndCleansOnRollback() throws Exception {
        when(uploader.upload(any(byte[].class), anyMap())).thenReturn(Map.of("secure_url", "https://example.test/new.pdf"));
        var file = new MockMultipartFile("file", "Bài học.pdf", "application/pdf", "%PDF-1.7\n".getBytes(StandardCharsets.US_ASCII));
        var result = mapper.readTree(service.documents("https://example.test/old.pdf", file));
        assertEquals(2, result.size()); assertEquals("Bài học.pdf", result.get(1).get("name").asText());
        verify(uploader, never()).destroy(anyString(), anyMap());
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verify(uploader).destroy(eq(result.get(1).get("publicId").asText()), anyMap());
    }
}
