package com.jtech.service;

import com.jtech.controller.VocabularyController;
import com.jtech.dto.request.*;
import com.jtech.entity.*;
import com.jtech.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** One method per column in the Vocab Chapter Test report sheet. */
class VocabularyChapterUnitTest {

    private final ChapterRepository chapters = mock(ChapterRepository.class);
    private final LessonRepository lessons = mock(LessonRepository.class);
    private final VocabularyMiniTestRepository tests = mock(VocabularyMiniTestRepository.class);
    private final VocabularyMiniTestQuestionRepository questions = mock(VocabularyMiniTestQuestionRepository.class);
    private final VocabularyMiniTestLinkRepository links = mock(VocabularyMiniTestLinkRepository.class);
    private final VocabularyChapterTestService service = new VocabularyChapterTestService(chapters, lessons, tests, questions, links, mock(VocabularyService.class), mock(VocabularyMiniTestService.class));
    @BeforeEach void setup() { when(chapters.findForUpdate(1L)).thenReturn(Optional.of(new Chapter())); }
    private VocabularyChapterTestRequest request(List<Long> ids) { return new VocabularyChapterTestRequest("Chapter", "", 20, new BigDecimal("70"), VocabularyMiniTest.Status.DRAFT, ids); }

    @Test
    @DisplayName("Vocab Chapter Test/UTC001: Reject duplicate chapter questions")
    void utc001() throws Exception {
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, request(List.of(5L,5L))));
        verifyNoInteractions(links); verify(tests, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Vocab Chapter Test/UTC002: Reject ineligible chapter question")
    void utc002() throws Exception {
        var q = new VocabularyMiniTestQuestion(); q.setId(10L); q.setLessonId(99L);
        when(questions.findBankForChapter(1L, VocabularyMiniTestQuestion.Skill.VOCABULARY, VocabularyMiniTestQuestion.Type.MCQ, VocabularyMiniTestQuestion.Status.ACTIVE)).thenReturn(List.of(q));
        assertThrows(IllegalArgumentException.class, () -> service.save(1L, request(List.of(10L))));
        verifyNoInteractions(links); verify(tests, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Vocab Chapter Test/UTC003: Reject edit after attempt")
    void utc003() throws Exception {
        var t = new VocabularyMiniTest(); t.setId(8L);
        when(tests.findByChapterIdAndTestTypeAndSkillOrderByIdDesc(1L, VocabularyMiniTest.Type.CHAPTER_TEST, VocabularyMiniTest.Skill.VOCABULARY)).thenReturn(List.of(t));
        when(tests.countAttempts(8L)).thenReturn(1L);
        assertThrows(IllegalStateException.class, () -> service.save(1L, request(List.of(10L)))); verifyNoInteractions(links, questions);
    }
}
