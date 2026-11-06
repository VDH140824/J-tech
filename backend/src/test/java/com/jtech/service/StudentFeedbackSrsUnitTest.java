package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackRequest;
import com.jtech.repository.UserRepository;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

/** CD-16: SRS 2.4.34, 2.4.35; BR27. No application context, database or network. */
@DisplayName("CD-16 Student Feedback — SRS UC-34 / UC-35")
class StudentFeedbackSrsUnitTest {
    private static ValidatorFactory factory;
    private static Validator validator;
    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FeedbackService service = new FeedbackService(db, users, cloudinary, events);

    @BeforeAll static void validationSetup() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }
    @AfterAll static void validationCleanup() { factory.close(); }

    private FeedbackRequest technical(String title, String description) {
        return new FeedbackRequest(FeedbackRequest.Type.TECHNICAL, "SYSTEM", title, description, null, null);
    }

    private void assertInvalidField(FeedbackRequest request, String field) {
        assertTrue(validator.validate(request).stream()
            .anyMatch(v -> v.getPropertyPath().toString().equals(field)));
    }

    @ParameterizedTest(name = "UT16-05 title blank: [{0}]")
    @NullAndEmptySource @ValueSource(strings = {"   "})
    void rejectsBlankTitle(String title) {
        assertInvalidField(technical(title, "Description"), "title");
    }

    @Test @DisplayName("UT16-06 BR27 accepts title of 200 characters")
    void acceptsTitleAtLimit() {
        assertTrue(validator.validate(technical("T".repeat(200), "Description")).isEmpty());
    }

    @Test @DisplayName("UT16-07 BR27 rejects title of 201 characters")
    void rejectsTitleAboveLimit() {
        assertInvalidField(technical("T".repeat(201), "Description"), "title");
    }

    @ParameterizedTest(name = "UT16-08 description blank: [{0}]")
    @NullAndEmptySource @ValueSource(strings = {"   "})
    void rejectsBlankDescription(String description) {
        assertInvalidField(technical("Title", description), "content");
    }

    @Test @DisplayName("UT16-09 BR27 accepts description of 10000 characters")
    void acceptsDescriptionAtLimit() {
        assertTrue(validator.validate(technical("Title", "D".repeat(10000))).isEmpty());
    }

    @Test @DisplayName("UT16-10 BR27 rejects description of 10001 characters")
    void rejectsDescriptionAboveLimit() {
        assertInvalidField(technical("Title", "D".repeat(10001)), "content");
    }

    @Test @DisplayName("UT16-03 UC-34 A2 image is optional")
    void acceptsNoImage() { assertDoesNotThrow(() -> service.validateImage(null)); }

    // These bytes exercise the existing header validator only; they are not decoded image fixtures.
    @ParameterizedTest(name = "UT16-11 BR27 accepts {0}")
    @CsvSource({"jpg,image/jpeg", "jpeg,image/jpeg", "png,image/png", "webp,image/webp"})
    void acceptsDocumentedImageFormats(String extension, String mime) {
        byte[] header = switch (extension) {
            case "png" -> new byte[] {(byte)137,80,78,71,13,10,26,10};
            case "webp" -> new byte[] {82,73,70,70,0,0,0,0,87,69,66,80};
            default -> new byte[] {(byte)255,(byte)216,(byte)255};
        };
        assertDoesNotThrow(() -> service.validateImage(
            new MockMultipartFile("image", "test." + extension, mime, header)));
    }

    @Test @DisplayName("UT16-12 BR27 rejects a PDF attachment")
    void rejectsNonImageFormat() {
        assertThrows(IllegalArgumentException.class, () -> service.validateImage(
            new MockMultipartFile("image", "test.pdf", "application/pdf", new byte[] {1})));
    }

    private MockMultipartFile pngWithSize(int size) {
        byte[] bytes = new byte[size];
        System.arraycopy(new byte[] {(byte)137,80,78,71,13,10,26,10}, 0, bytes, 0, 8);
        return new MockMultipartFile("image", "test.png", "image/png", bytes);
    }

    @Test
    @DisplayName("UT16-14 BR27 rejects an image above 3 MB")
    void rejectsImageAboveLimit() {
        assertThrows(IllegalArgumentException.class,
            () -> service.validateImage(pngWithSize(4_000_000)));
    }
}
