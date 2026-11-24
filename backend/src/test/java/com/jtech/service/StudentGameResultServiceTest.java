package com.jtech.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.jtech.controller.StudentGameController.ResultRequest;
import com.jtech.repository.UserRewardBalanceRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.server.ResponseStatusException;

class StudentGameResultServiceTest {

    private static final long STUDENT_ID = 7L;
    private static final String SESSION_ID = "c4c73465-66df-4c93-a26c-46f0b4d88db5";

    private final JdbcTemplate db = mock(JdbcTemplate.class);
    private final UserRewardBalanceRepository balances = mock(UserRewardBalanceRepository.class);
    private final CoinRewardService coins = mock(CoinRewardService.class);
    private final LearningActivityService activities = mock(LearningActivityService.class);
    private final StudentGameResultService service =
        new StudentGameResultService(db, balances, coins, activities);

    private ResultRequest request(String gameType, String title, int correct, int total) {
        return new ResultRequest(SESSION_ID, gameType, title, correct, total);
    }

    private void generatedId(long id) {
        doAnswer(invocation -> {
            KeyHolder keys = invocation.getArgument(1);
            keys.getKeyList().add(Map.of("id", id));
            return 1;
        }).when(db).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    @Test
    void saveResultRain() {
        generatedId(42L);

        var result = service.saveResult(STUDENT_ID,
            request("VOCABULARY_RAIN", "  Vocabulary Rain  ", 3, 5));

        assertEquals(new StudentGameResultService.GameResult(
            42L, SESSION_ID, "VOCABULARY_RAIN", "Vocabulary Rain", 3, 5, 30L), result);
        verify(balances).lockAccount(STUDENT_ID);
        verify(db).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
        verify(activities).recordGameCompletion(eq(STUDENT_ID), eq(SESSION_ID), any(LocalDateTime.class));
        verify(coins).awardCoins(STUDENT_ID,
            new CoinRewardService.ActivityRef(CoinRewardService.SourceType.GAME, 42L),
            new CoinRewardService.RewardAllocation(30L, 0L),
            "GAME:" + STUDENT_ID + ":" + SESSION_ID);
    }

    @Test
    void saveResultFruit() {
        generatedId(43L);

        var result = service.saveResult(STUDENT_ID,
            request(" kanji_fruit ", "Kanji Fruit", 2, 4));

        assertEquals(new StudentGameResultService.GameResult(
            43L, SESSION_ID, "KANJI_FRUIT", "Kanji Fruit", 2, 4, 20L), result);
        verify(activities).recordGameCompletion(eq(STUDENT_ID), eq(SESSION_ID), any(LocalDateTime.class));
        verify(coins).awardCoins(eq(STUDENT_ID),
            eq(new CoinRewardService.ActivityRef(CoinRewardService.SourceType.GAME, 43L)),
            eq(new CoinRewardService.RewardAllocation(20L, 0L)), anyString());
    }

    @Test
    void saveResultDuplicate() {
        var previous = new StudentGameResultService.GameResult(
            50L, SESSION_ID, "VOCABULARY_RAIN", "Previous", 1, 5, 10L);
        when(db.query(anyString(), any(RowMapper.class), eq(STUDENT_ID), eq(SESSION_ID)))
            .thenReturn(List.of(previous));

        var result = service.saveResult(STUDENT_ID,
            request("VOCABULARY_RAIN", "New title", 4, 5));

        assertSame(previous, result);
        verify(balances).lockAccount(STUDENT_ID);
        verify(db, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
        verifyNoInteractions(activities, coins);
    }

    @Test
    void saveResultZero() {
        generatedId(44L);

        var result = service.saveResult(STUDENT_ID,
            request("VOCABULARY_RAIN", "Zero score", 0, 5));

        assertEquals(0L, result.coinAwarded());
        verify(activities).recordGameCompletion(eq(STUDENT_ID), eq(SESSION_ID), any(LocalDateTime.class));
        verifyNoInteractions(coins);
    }

    @Test
    void saveResultInvalidUuid() {
        var invalid = new ResultRequest("invalid", "VOCABULARY_RAIN", "Rain", 1, 5);

        var error = assertThrows(ResponseStatusException.class,
            () -> service.saveResult(STUDENT_ID, invalid));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(db, balances, coins, activities);
    }

    @Test
    void saveResultInvalidType() {
        var error = assertThrows(ResponseStatusException.class,
            () -> service.saveResult(STUDENT_ID, request("OTHER", "Game", 1, 5)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(db, balances, coins, activities);
    }

    @Test
    void saveResultInvalidCount() {
        var error = assertThrows(ResponseStatusException.class,
            () -> service.saveResult(STUDENT_ID, request("VOCABULARY_RAIN", "Rain", 6, 5)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verifyNoInteractions(db, balances, coins, activities);
    }

    @Test
    void saveResultMissingId() {
        var error = assertThrows(IllegalStateException.class,
            () -> service.saveResult(STUDENT_ID,
                request("VOCABULARY_RAIN", "Rain", 1, 5)));

        assertEquals("Không thể lưu thành tích trò chơi.", error.getMessage());
        verify(db).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
        verifyNoInteractions(activities, coins);
    }
}
