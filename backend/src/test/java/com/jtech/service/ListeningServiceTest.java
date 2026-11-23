package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.request.ListeningSubmitRequest;
import com.jtech.repository.CoinTransactionRepository;
import com.jtech.repository.LearningProgressRepository;
import com.jtech.repository.ListeningRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Nghe hiểu: chấm lại ở server, đạt 80 điểm thì hoàn thành bài và thưởng xu lần đầu. */
@ExtendWith(MockitoExtension.class)
class ListeningServiceTest {

    @Mock private ListeningRepository listening;
    @Mock private LearningProgressRepository progress;
    @Mock private LearningActivityService activities;
    @Mock private CoinRewardService coins;
    @Mock private CoinTransactionRepository coinTransactions;

    private ListeningService service;

    private static final ListeningRepository.Exercise EXERCISE = new ListeningRepository.Exercise(
        5L, 11L, 1L, "Nhật 1", 1, "Nghe bài 1", "", "わたしは がくせいです。", "Tôi là sinh viên.");

    private static ListeningRepository.QuestionRow row(long id, String correct) {
        return new ListeningRepository.QuestionRow(id, "Câu " + id, null,
            "{\"options\":{\"A\":\"a\",\"B\":\"b\",\"C\":\"c\",\"D\":\"d\"},\"correctAnswer\":\"" + correct + "\"}");
    }

    @BeforeEach
    void setUp() {
        service = new ListeningService(listening, progress, activities, coins, coinTransactions, new ObjectMapper());
        when(listening.findPublishedExercise(11L)).thenReturn(Optional.of(EXERCISE));
    }

    @Test
    void detailHidesAnswersAndTreatsBlankAudioAsMissing() {
        when(listening.findQuestions(5L)).thenReturn(List.of(row(1, "B"), new ListeningRepository.QuestionRow(2, "hỏng", null, "{}")));

        var detail = service.detail(11L, 7L);

        assertNull(detail.audioUrl());
        assertEquals(1, detail.questions().size(), "corrupt answer_data is skipped");
        assertEquals(4, detail.questions().get(0).options().size());
    }

    @Test
    void passingSubmitCompletesLessonAndAwardsCoinsOnce() {
        when(listening.findQuestions(5L)).thenReturn(List.of(row(1, "B"), row(2, "C")));
        when(listening.saveAttempt(eq(7L), eq(11L), eq(5L), eq(2), eq(2), any(), anyString(), any())).thenReturn(99L);
        when(progress.findEnabledCoinReward("LISTENING")).thenReturn(Optional.of(10L));
        when(coinTransactions.findByAwardKey("LISTENING:7:5")).thenReturn(Optional.empty());

        var result = service.submit(11L, 7L, new ListeningSubmitRequest(Map.of("1", "b", "2", "C")));

        assertTrue(result.passed());
        assertEquals(0, BigDecimal.valueOf(100).compareTo(result.score()));
        assertEquals(10L, result.coinsAwarded());
        verify(activities).recordPracticeCompletion(7L, 99L);
        verify(listening).saveLessonCompletion(eq(7L), eq(11L), any(), any());
        verify(coins).awardCoins(eq(7L), any(), any(), eq("LISTENING:7:5"));
    }

    @Test
    void failingSubmitDoesNotCompleteOrAward() {
        when(listening.findQuestions(5L)).thenReturn(List.of(row(1, "B"), row(2, "C")));
        when(listening.saveAttempt(anyLong(), anyLong(), anyLong(), anyInt(), anyInt(), any(), anyString(), any())).thenReturn(99L);

        var result = service.submit(11L, 7L, new ListeningSubmitRequest(Map.of("1", "B", "2", "A")));

        assertFalse(result.passed());
        assertEquals(0L, result.coinsAwarded());
        verify(listening, never()).saveLessonCompletion(anyLong(), anyLong(), any(), any());
        verifyNoInteractions(coins);
    }

    @Test
    void submitRejectsMissingOrForeignAnswers() {
        when(listening.findQuestions(5L)).thenReturn(List.of(row(1, "B"), row(2, "C")));

        var missing = assertThrows(ResponseStatusException.class,
            () -> service.submit(11L, 7L, new ListeningSubmitRequest(Map.of("1", "B"))));
        var foreign = assertThrows(ResponseStatusException.class,
            () -> service.submit(11L, 7L, new ListeningSubmitRequest(Map.of("1", "B", "2", "C", "3", "A"))));

        assertEquals(HttpStatus.BAD_REQUEST, missing.getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, foreign.getStatusCode());
        verify(listening, never()).saveAttempt(anyLong(), anyLong(), anyLong(), anyInt(), anyInt(), any(), anyString(), any());
    }
}
