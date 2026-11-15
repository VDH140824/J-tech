package com.jtech.service.impl;

import com.jtech.dto.request.ConjugationFormRequest;
import com.jtech.dto.request.ConjugationQuestionRequest;
import com.jtech.entity.Question;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Ràng buộc request của UC-47: CF-01 UTCID08–09 và CF-07 UTCID09 trong Report5_Unit_Test_Linh.xlsx. */
class ConjugationFormRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static Set<String> invalidFields(Set<? extends ConstraintViolation<?>> violations) {
        return violations.stream().map(v -> v.getPropertyPath().toString()).collect(Collectors.toSet());
    }

    private static ConjugationFormRequest formRequest(int questionsPerPractice) {
        return new ConjugationFormRequest("TE_FORM", "Thể te", "て形", null,
                "【Nhóm I】\n書く → 書いて", questionsPerPractice, 0, null);
    }

    @Test
    void CF01_UTCID08_questionsPerPracticeFive_isValid() {
        assertTrue(!invalidFields(validator.validate(formRequest(5))).contains("questionsPerPractice"));
    }

    @Test
    void CF01_UTCID09_questionsPerPracticeFour_violatesMin() {
        Set<ConstraintViolation<ConjugationFormRequest>> violations = validator.validate(formRequest(4));
        ConstraintViolation<ConjugationFormRequest> v = violations.stream()
                .filter(x -> x.getPropertyPath().toString().equals("questionsPerPractice")).findFirst().orElseThrow();
        assertEquals("Số câu hỏi mỗi lượt phải tối thiểu là 5.", v.getMessage());
    }

    @Test
    void CF07_UTCID09_blankVerbGroupFourAndFourOptions_violateConstraints() {
        ConjugationQuestionRequest request = new ConjugationQuestionRequest("", "かく", null, 4, Question.Difficulty.EASY,
                "書いて", null, List.of("a", "b", "c", "d"), null, true);

        Set<String> fields = invalidFields(validator.validate(request));

        assertTrue(fields.containsAll(Set.of("verb", "verbGroup", "options")));
    }
}
