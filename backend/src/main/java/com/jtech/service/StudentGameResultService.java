package com.jtech.service;

import com.jtech.controller.StudentGameController.ResultRequest;
import com.jtech.repository.UserRewardBalanceRepository;
import java.sql.Statement;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudentGameResultService {
    public record GameResult(long id, String sessionId, String gameType, String title,
            int correctCount, int totalCount, long coinAwarded) {}

    private final JdbcTemplate db;
    private final UserRewardBalanceRepository balances;
    private final CoinRewardService coins;

    public StudentGameResultService(JdbcTemplate db, UserRewardBalanceRepository balances, CoinRewardService coins) {
        this.db = db;
        this.balances = balances;
        this.coins = coins;
    }

    @Transactional
    public GameResult saveResult(long studentId, ResultRequest request) {
        UUID sessionId;
        try {
            sessionId = UUID.fromString(request.sessionId());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã lượt chơi không hợp lệ.");
        }

        String gameType = request.gameType().trim().toUpperCase(java.util.Locale.ROOT);
        if (!gameType.equals("VOCABULARY_RAIN") && !gameType.equals("KANJI_FRUIT")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Loại trò chơi không hợp lệ.");
        }
        if (request.correctCount() > request.totalCount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số câu đúng không hợp lệ.");
        }

        balances.lockAccount(studentId);
        String sessionKey = sessionId.toString();
        var previous = db.query(
            "SELECT id, session_id, game_type, title, correct_count, total_count, coin_awarded FROM game_result WHERE user_id=? AND session_id=?",
            (rs, row) -> new GameResult(rs.getLong("id"), rs.getString("session_id"), rs.getString("game_type"),
                rs.getString("title"), rs.getInt("correct_count"), rs.getInt("total_count"), rs.getLong("coin_awarded")),
            studentId, sessionKey
        ).stream().findFirst();
        if (previous.isPresent()) return previous.get();

        String title = request.title().trim();
        if (title.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên lượt chơi không hợp lệ.");
        int correctCount = request.correctCount();
        int totalCount = request.totalCount();
        long coinAwarded = correctCount * 10L;
        KeyHolder keys = new GeneratedKeyHolder();
        db.update(connection -> {
            var statement = connection.prepareStatement(
                "INSERT INTO game_result (user_id, session_id, game_type, title, correct_count, total_count, coin_awarded) VALUES (?, ?, ?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, studentId);
            statement.setString(2, sessionKey);
            statement.setString(3, gameType);
            statement.setString(4, title);
            statement.setInt(5, correctCount);
            statement.setInt(6, totalCount);
            statement.setLong(7, coinAwarded);
            return statement;
        }, keys);
        Number generatedId = keys.getKey();
        if (generatedId == null) throw new IllegalStateException("Không thể lưu thành tích trò chơi.");
        long resultId = generatedId.longValue();

        if (coinAwarded > 0) {
            coins.awardCoins(studentId,
                new CoinRewardService.ActivityRef(CoinRewardService.SourceType.GAME, resultId),
                new CoinRewardService.RewardAllocation(coinAwarded, 0),
                "GAME:" + studentId + ":" + sessionKey);
        }
        return new GameResult(resultId, sessionKey, gameType, title, correctCount, totalCount, coinAwarded);
    }
}
