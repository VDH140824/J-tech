package com.jtech.service;

import com.cloudinary.Cloudinary;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import java.io.IOException;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class CloudinaryServiceTest {
    Cloudinary cloudinary;
    CloudinaryService service;

    @BeforeEach void setUp() {
        cloudinary = mock(Cloudinary.class, RETURNS_DEEP_STUBS);
        service = new CloudinaryService(cloudinary);
    }

    @ParameterizedTest @ValueSource(strings = {"docx", "pptx", "ppt", "pdf", "xlsx", "PDF"})
    void uploadDocument_success(String extension) throws Exception {
        when(cloudinary.uploader().upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://example.test/file", "public_id", "Jtech/Lessons/Documents/file." + extension));
        var file = new MockMultipartFile("file", "lesson." + extension, "application/octet-stream", new byte[]{1});
        var result = service.uploadDocument(file);
        assertEquals("lesson." + extension, result.get("name"));
        assertEquals("https://example.test/file", result.get("url"));
        verify(cloudinary.uploader()).upload(eq(new byte[]{1}), argThat(options ->
                "raw".equals(options.get("resource_type")) && Boolean.FALSE.equals(options.get("overwrite")) &&
                "Jtech/Lessons/Documents".equals(options.get("folder"))));
    }

    @ParameterizedTest @ValueSource(strings = {"doc", "xls", "exe", "zip", "png", ""})
    void uploadDocument_invalidType(String extension) {
        var file = new MockMultipartFile("file", "file." + extension, "application/octet-stream", new byte[]{1});
        assertThrows(IllegalArgumentException.class, () -> service.uploadDocument(file));
        verifyNoInteractions(cloudinary);
    }

    @Test void uploadDocument_invalidMime() {
        var file = new MockMultipartFile("file", "file.pdf", "image/png", new byte[]{1});
        assertThrows(IllegalArgumentException.class, () -> service.uploadDocument(file));
        verifyNoInteractions(cloudinary);
    }

    @Test void uploadDocument_emptyFile() {
        assertThrows(IllegalArgumentException.class, () -> service.uploadDocument(null));
        assertThrows(IllegalArgumentException.class, () -> service.uploadDocument(
                new MockMultipartFile("file", "file.pdf", "application/pdf", new byte[0])));
        verifyNoInteractions(cloudinary);
    }

    @Test void uploadDocument_uploadFailed() throws Exception {
        when(cloudinary.uploader().upload(any(byte[].class), anyMap())).thenThrow(new IOException("offline"));
        var error = assertThrows(IllegalStateException.class, () -> service.uploadDocument(
                new MockMultipartFile("file", "file.pdf", "application/pdf", new byte[]{1})));
        assertEquals("Không thể tải tài liệu lên Cloudinary", error.getMessage());
    }

    @Test void uploadDocument_missingResult() throws Exception {
        when(cloudinary.uploader().upload(any(byte[].class), anyMap())).thenReturn(Map.of());
        assertThrows(IllegalStateException.class, () -> service.uploadDocument(
                new MockMultipartFile("file", "file.pdf", "application/pdf", new byte[]{1})));
    }

    @Test void deleteDocument_success() throws Exception {
        service.deleteDocument("Jtech/Lessons/Documents/file.pdf");
        verify(cloudinary.uploader()).destroy(eq("Jtech/Lessons/Documents/file.pdf"),
                argThat(options -> "raw".equals(options.get("resource_type"))));
    }

    @Test void deleteDocument_unmanagedFile() {
        service.deleteDocument(null);
        service.deleteDocument("other-folder/file.pdf");
        verifyNoInteractions(cloudinary);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ok", "not found"})
    void deleteVocabularyPdf_acceptsDeletedOrAbsentAsset(String result) throws Exception {
        String publicId = "Jtech/Lessons/Documents/file.pdf";
        when(cloudinary.uploader().destroy(eq(publicId), anyMap())).thenReturn(Map.of("result", result));

        service.deleteVocabularyPdf(publicId);

        verify(cloudinary.uploader()).destroy(eq(publicId), argThat(options ->
                "raw".equals(options.get("resource_type")) && Boolean.TRUE.equals(options.get("invalidate"))));
    }

    @Test
    void deleteVocabularyPdf_rejectsUnconfirmedDeletion() throws Exception {
        String publicId = "Jtech/Lessons/Documents/file.pdf";
        when(cloudinary.uploader().destroy(eq(publicId), anyMap())).thenReturn(Map.of("result", "error"));

        assertThrows(IllegalStateException.class, () -> service.deleteVocabularyPdf(publicId));
    }
}
