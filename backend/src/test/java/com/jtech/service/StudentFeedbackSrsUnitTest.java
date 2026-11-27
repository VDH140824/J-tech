package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackRequest;
import com.jtech.repository.UserRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

/** CD-16: SRS UC-34, UC-35 and BR27. */
class StudentFeedbackSrsUnitTest {
    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setupValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    private FeedbackRequest request(String title, String content) {
        return new FeedbackRequest(FeedbackRequest.Type.TECHNICAL, "SYSTEM", title, content, null, null);
    }

    private void assertInvalid(FeedbackRequest request, String field) {
        assertTrue(validator.validate(request).stream().anyMatch(v -> v.getPropertyPath().toString().equals(field)));
    }

    @Test
    void validateFeedbackRequest() {
        assertInvalid(request(null, "Description"), "title");
        assertInvalid(request("   ", "Description"), "title");
        assertTrue(validator.validate(request("T".repeat(200), "Description")).isEmpty());
        assertInvalid(request("T".repeat(201), "Description"), "title");
        assertInvalid(request("Title", null), "content");
        assertInvalid(request("Title", "   "), "content");
        assertTrue(validator.validate(request("Title", "D".repeat(10_000))).isEmpty());
        assertInvalid(request("Title", "D".repeat(10_001)), "content");
    }

    @Test
    void validateImage() {
        var service = new FeedbackService(
            mock(JdbcTemplate.class), mock(UserRepository.class), mock(Cloudinary.class), mock(ApplicationEventPublisher.class)
        );
        assertDoesNotThrow(() -> service.validateImage(null));
        assertDoesNotThrow(() -> service.validateImage(image("jpg", "image/jpeg", new byte[] {(byte) 255, (byte) 216, (byte) 255})));
        assertDoesNotThrow(() -> service.validateImage(image("jpeg", "image/jpeg", new byte[] {(byte) 255, (byte) 216, (byte) 255})));
        assertDoesNotThrow(() -> service.validateImage(image("png", "image/png", new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10})));
        assertDoesNotThrow(() -> service.validateImage(image("webp", "image/webp", new byte[] {82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80})));
        assertThrows(IllegalArgumentException.class, () -> service.validateImage(image("pdf", "application/pdf", new byte[] {1})));
        assertThrows(IllegalArgumentException.class, () -> service.validateImage(pngWithSize(4_000_000)));
    }

    private MockMultipartFile image(String extension, String mime, byte[] bytes) {
        return new MockMultipartFile("image", "test." + extension, mime, bytes);
    }

    private MockMultipartFile pngWithSize(int size) {
        var bytes = new byte[size];
        System.arraycopy(new byte[] {(byte) 137, 80, 78, 71, 13, 10, 26, 10}, 0, bytes, 0, 8);
        return image("png", "image/png", bytes);
    }
}
