package com.jtech.service;

import com.jtech.dto.request.VocabularyChapterTestRequest;
import com.jtech.entity.*;
import com.jtech.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VocabularyChapterTestServiceTest {
    private final ChapterRepository chapters = mock(ChapterRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyMiniTestRepository tests = mock(VocabularyMiniTestRepository.class);
    private final VocabularyMiniTestQuestionRepository questions = mock(VocabularyMiniTestQuestionRepository.class);
    private final VocabularyMiniTestLinkRepository links = mock(VocabularyMiniTestLinkRepository.class);
    private final VocabularyChapterTestService service = new VocabularyChapterTestService(chapters, lessons, tests, questions, links, mock(VocabularyService.class), mock(VocabularyMiniTestService.class));
    @BeforeEach void setup() { when(chapters.findForUpdate(1L)).thenReturn(Optional.of(new Chapter())); }
    private VocabularyChapterTestRequest input(List<Long> ids) {
        return new VocabularyChapterTestRequest("Vocab chương 1", "", 20, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT, ids);
    }
    @Test void rejectsDuplicateQuestionIdsWithoutChangingBankOrLinks() {
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, input(List.of(5L, 5L))));
        verifyNoInteractions(links); verify(tests, never()).saveAndFlush(any());
    }
    @Test void refusesQuestionsOutsideEligibleVocabularyLessons() {
        var wrongLessonQuestion = new VocabularyMiniTestQuestion(); wrongLessonQuestion.setId(10L); wrongLessonQuestion.setLessonId(99L);
        when(questions.findBankForChapter(1L, VocabularyMiniTestQuestion.Skill.VOCABULARY, VocabularyMiniTestQuestion.Type.MCQ, VocabularyMiniTestQuestion.Status.ACTIVE)).thenReturn(List.of(wrongLessonQuestion));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, input(List.of(10L))));
        verifyNoInteractions(links); verify(tests, never()).saveAndFlush(any());
    }
    @Test void preventsEditingOnceAttemptsExist() {
        var test = new VocabularyMiniTest(); test.setId(8L);
        when(tests.findByChapterIdAndTestTypeAndSkillOrderByIdDesc(1L, VocabularyMiniTest.Type.CHAPTER_TEST, VocabularyMiniTest.Skill.VOCABULARY)).thenReturn(List.of(test));
        when(tests.countAttempts(8L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.save(1L, input(List.of(10L))));
        verifyNoInteractions(links, questions);
    }
}
