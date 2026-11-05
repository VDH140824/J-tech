package com.jtech.controller;

import static org.junit.jupiter.api.Assertions.*;

import com.jtech.dto.request.VocabularyRequest;
import com.jtech.entity.Course;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class VocabularyInputValidationTest {

    // UC-42 E1: these text fields are required for both create and update.
    @ParameterizedTest(name = "Required field {0}")
    @ValueSource(strings = {"word", "reading", "meaningVi"})
    void rejectMissingOrBlankText(String field) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String value : new String[] {null, "", " "}) {
                assertFalse(validator.validateValue(VocabularyRequest.class, field, value).isEmpty());
            }
        }
    }

    // UC-42 E1 requires rejecting overlong inputs. Numeric limits come from VocabularyRequest.
    @ParameterizedTest(name = "{0} max length {1}")
    @CsvSource({"word, 100", "reading, 100", "meaningVi, 255", "wordType, 50", "exampleJp, 500", "exampleVi, 500"})
    void validateFieldLength(String field, int maximum) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validateValue(VocabularyRequest.class, field, "a".repeat(maximum)).isEmpty());
            assertFalse(validator.validateValue(VocabularyRequest.class, field, "a".repeat(maximum + 1)).isEmpty());
        }
    }

    @ParameterizedTest(name = "Display order {0}, valid = {1}")
    @CsvSource({", false", "-1, false", "0, true", "1, true"})
    void validateDisplayOrder(Integer value, boolean valid) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertEquals(valid, factory.getValidator()
                .validateValue(VocabularyRequest.class, "displayOrder", value).isEmpty());
        }
    }

    @Test
    void acceptInputWithoutOptionalFieldsOrAudioUrl() {
        // Example values are test fixtures. Pronunciation uses synthesis.
        var input = new VocabularyRequest("日本語", "にほんご", "Tiếng Nhật", null, null, null, 0, Course.Status.DRAFT);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(input).isEmpty());
        }
    }
}
