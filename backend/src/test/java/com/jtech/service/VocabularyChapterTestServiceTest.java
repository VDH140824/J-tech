package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.jtech.dto.request.VocabularyChapterTestRequest;
import com.jtech.entity.*;
import com.jtech.repository.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class VocabularyChapterTestServiceTest {

    private final ChapterRepository chapters = mock(ChapterRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyTestRepository tests = mock(VocabularyTestRepository.class);
    private final VocabularyTestQuestionRepository questions = mock(
        VocabularyTestQuestionRepository.class
    );
    private final VocabularyTestQuestionLinkRepository links = mock(
        VocabularyTestQuestionLinkRepository.class
    );
    private final VocabularyChapterTestService service = new VocabularyChapterTestService(
        chapters,
        lessons,
        tests,
        questions,
        links,
        mock(VocabularyService.class),
        mock(VocabularyExerciseService.class)
    );

    @BeforeEach
    void setup() {
        when(chapters.findForUpdate(1L)).thenReturn(Optional.of(new Chapter()));
    }

    private VocabularyChapterTestRequest input(List<Long> ids) {
        return new VocabularyChapterTestRequest(
            "Vocab chương 1",
            "",
            20,
            new BigDecimal("70"),
            VocabularyTest.Status.DRAFT,
            ids
        );
    }

    @Test
    void rejectsDuplicateQuestionIdsWithoutChangingBankOrLinks() {
        assertThrows(IllegalArgumentException.class, () ->
            service.save(1L, input(List.of(5L, 5L)))
        );
        verifyNoInteractions(links);
        verify(tests, never()).saveAndFlush(any());
    }

    @Test
    void refusesQuestionsOutsideEligibleVocabularyLessons() {
        var wrongLessonQuestion = new VocabularyTestQuestion();
        wrongLessonQuestion.setId(10L);
        wrongLessonQuestion.setLessonId(99L);
        when(
            questions.findBankForChapter(
                1L,
                VocabularyTestQuestion.Skill.VOCABULARY,
                VocabularyTestQuestion.Type.MCQ,
                VocabularyTestQuestion.Status.ACTIVE
            )
        ).thenReturn(List.of(wrongLessonQuestion));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, input(List.of(10L))));
        verifyNoInteractions(links);
        verify(tests, never()).saveAndFlush(any());
    }

    @Test
    void preventsEditingOnceAttemptsExist() {
        var test = new VocabularyTest();
        test.setId(8L);
        when(
            tests.findByChapterIdAndTestTypeAndSkillOrderByIdDesc(
                1L,
                VocabularyTest.Type.CHAPTER_TEST,
                VocabularyTest.Skill.VOCABULARY
            )
        ).thenReturn(List.of(test));
        when(tests.countAttempts(8L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.save(1L, input(List.of(10L))));
        verifyNoInteractions(links, questions);
    }
}
