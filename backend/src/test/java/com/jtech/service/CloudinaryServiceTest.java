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

    @Test void commentAttachmentUploadsImageWithImageResourceType() throws Exception {
        when(cloudinary.uploader().upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/demo/image/upload/photo.png",
                "public_id", "Jtech/Classroom/Comment/photo"));
        var result = service.uploadCommentAttachment(new MockMultipartFile(
                "attachment", "photo.png", "image/png", new byte[]{1}));
        assertEquals("image", result.get("resourceType"));
        verify(cloudinary.uploader()).upload(any(byte[].class), argThat(options ->
                "image".equals(options.get("resource_type"))
                        && "Jtech/Classroom/Comment".equals(options.get("folder"))));
    }

    @Test void commentAttachmentUploadsDocumentAsRaw() throws Exception {
        when(cloudinary.uploader().upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/demo/raw/upload/document.pdf",
                "public_id", "Jtech/Classroom/Comment/document.pdf"));
        var result = service.uploadCommentAttachment(new MockMultipartFile(
                "attachment", "document.pdf", "application/pdf", new byte[]{1}));
        assertEquals("raw", result.get("resourceType"));
    }

    @ParameterizedTest @CsvSource({
            "mp3, audio/mpeg", "wav, audio/wav", "m4a, audio/mp4",
            "ogg, audio/ogg", "webm, audio/webm"})
    void commentAttachmentUploadsAudioAsVideo(String extension, String mime) throws Exception {
        when(cloudinary.uploader().upload(any(byte[].class), anyMap())).thenReturn(Map.of(
                "secure_url", "https://res.cloudinary.com/demo/video/upload/audio." + extension,
                "public_id", "Jtech/Classroom/Comment/audio"));
        var result = service.uploadCommentAttachment(new MockMultipartFile(
                "attachment", "recording." + extension, mime, new byte[]{1}));
        assertEquals("video", result.get("resourceType"));
        verify(cloudinary.uploader()).upload(any(byte[].class), argThat(options ->
                "video".equals(options.get("resource_type"))
                        && "Jtech/Classroom/Comment".equals(options.get("folder"))
                        && !options.get("public_id").toString().endsWith("." + extension)));
    }

    @Test void commentAttachmentRejectsAudioWithMismatchedMime() {
        assertThrows(IllegalArgumentException.class, () -> service.uploadCommentAttachment(
                new MockMultipartFile("attachment", "recording.mp3", "video/mp4", new byte[]{1})));
        verifyNoInteractions(cloudinary);
    }

    @Test void commentAttachmentRejectsInvalidOrOversizedFileBeforeUpload() {
        assertThrows(IllegalArgumentException.class, () -> service.uploadCommentAttachment(
                new MockMultipartFile("attachment", "program.exe", "application/octet-stream", new byte[]{1})));
        assertThrows(IllegalArgumentException.class, () -> service.uploadCommentAttachment(
                new MockMultipartFile("attachment", "document.pdf", "application/pdf",
                        new byte[15 * 1024 * 1024 + 1])));
        verifyNoInteractions(cloudinary);
    }

    @Test void commentAttachmentCleanupUsesImageResourceType() throws Exception {
        service.deleteCommentAttachmentByUrl("Jtech/Classroom/Comment/photo",
                "https://res.cloudinary.com/demo/image/upload/photo.png");
        verify(cloudinary.uploader()).destroy(eq("Jtech/Classroom/Comment/photo"),
                argThat(options -> "image".equals(options.get("resource_type"))));
    }

    @Test void commentAttachmentCleanupUsesVideoResourceTypeForAudio() throws Exception {
        service.deleteCommentAttachmentByUrl("Jtech/Classroom/Comment/audio",
                "https://res.cloudinary.com/demo/video/upload/audio.mp3");
        verify(cloudinary.uploader()).destroy(eq("Jtech/Classroom/Comment/audio"),
                argThat(options -> "video".equals(options.get("resource_type"))));
    }
}
