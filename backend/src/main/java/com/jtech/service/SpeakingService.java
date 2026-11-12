package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.SpeakingResponses.Scenario;
import com.jtech.dto.response.SpeakingResponses.ScriptLine;
import com.jtech.dto.response.SpeakingResponses.SessionResult;
import com.jtech.dto.response.SpeakingResponses.SessionStarted;
import com.jtech.dto.response.SpeakingResponses.TurnFeedback;
import com.jtech.dto.response.SpeakingResponses.TurnResult;
import com.jtech.dto.response.SpeakingResponses.WordScore;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.ToDoubleFunction;

/**
 * AI speaking practice: the learner speaks their lines of a scenario script, Azure scores the
 * pronunciation and Gemini comments on the content. Turns are kept in speaking_session.turns_data.
 */
@Service
public class SpeakingService {
    private static final int MAX_AUDIO_BYTES = 4 * 1024 * 1024; // about two minutes of 16 kHz mono PCM
    private static final double WEAK_WORD_SCORE = 85;
    private static final int MAX_WEAK_WORDS = 12;
    private static final TypeReference<List<ScriptLine>> SCRIPT = new TypeReference<>() {};
    private static final TypeReference<List<TurnResult>> TURNS = new TypeReference<>() {};
    private static final String PUBLISHED_CHAPTER = """
            c.status = 'PUBLISHED' AND EXISTS (SELECT 1 FROM course co WHERE co.id = c.course_id
              AND co.status = 'PUBLISHED' AND co.deleted_at IS NULL)""";

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate tx;
    private final AzurePronunciationClient azure;
    private final SpeakingFeedbackClient feedback;

    public SpeakingService(JdbcTemplate jdbc, ObjectMapper json, TransactionTemplate tx,
            AzurePronunciationClient azure, SpeakingFeedbackClient feedback) {
        this.jdbc = jdbc;
        this.json = json;
        this.tx = tx;
        this.azure = azure;
        this.feedback = feedback;
    }

    /** Published scenarios of a published chapter that have a usable script. */
    public List<Scenario> scenarios(long chapterId, String email) {
        long userId = userId(email);
        Integer chapters = jdbc.queryForObject(
                "SELECT COUNT(*) FROM chapter c WHERE c.id = ? AND " + PUBLISHED_CHAPTER, Integer.class, chapterId);
        if (chapters == null || chapters == 0) throw notFound("Không tìm thấy chương học.");
        return jdbc.query("""
                SELECT sc.id, sc.chapter_id, sc.title, sc.situation, sc.ai_role, sc.student_role, sc.sample_script,
                  (SELECT COUNT(*) FROM speaking_session s WHERE s.scenario_id = sc.id AND s.user_id = ?
                    AND s.status = 'COMPLETED') AS completed_count
                FROM speaking_scenario sc
                WHERE sc.chapter_id = ? AND sc.status = 'PUBLISHED'
                ORDER BY sc.display_order, sc.id
                """, (rs, row) -> new Scenario(rs.getLong("id"), rs.getLong("chapter_id"), rs.getString("title"),
                rs.getString("situation"), rs.getString("ai_role"), rs.getString("student_role"),
                readScript(rs.getString("sample_script")), rs.getInt("completed_count")), userId, chapterId)
                .stream().filter(s -> s.script().stream().anyMatch(l -> "STUDENT".equals(l.speaker()))).toList();
    }

    /** Starts a session; {@code swapped} makes the learner play the AI role of the script. */
    public SessionStarted start(long scenarioId, boolean swapped, String email) {
        long userId = userId(email);
        var scripts = jdbc.queryForList("""
                SELECT sc.sample_script FROM speaking_scenario sc JOIN chapter c ON c.id = sc.chapter_id
                WHERE sc.id = ? AND sc.status = 'PUBLISHED' AND\s""" + PUBLISHED_CHAPTER, String.class, scenarioId);
        String learner = swapped ? "AI" : "STUDENT";
        if (scripts.isEmpty() || readScript(scripts.getFirst()).stream().noneMatch(l -> learner.equals(l.speaker())))
            throw notFound("Không tìm thấy tình huống luyện nói.");
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(
                    "INSERT INTO speaking_session (user_id, scenario_id, swapped) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setLong(2, scenarioId);
            statement.setBoolean(3, swapped);
            return statement;
        }, key);
        return new SessionStarted(key.getKey().longValue());
    }

    /** Scores one learner line. Re-sending the same line replaces its earlier result. */
    public TurnResult submitTurn(long sessionId, int lineIndex, byte[] wav, String email) {
        Session session = session(sessionId, userId(email));
        if (!"IN_PROGRESS".equals(session.status()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiên luyện nói này đã kết thúc.");
        List<ScriptLine> script = session.context().script();
        if (lineIndex < 0 || lineIndex >= script.size() || !"STUDENT".equals(script.get(lineIndex).speaker()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dòng này không phải lượt nói của bạn.");
        if (wav == null || wav.length < 1024)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không nhận được âm thanh. Hãy nói lại.");
        if (wav.length > MAX_AUDIO_BYTES)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Đoạn ghi âm quá dài, hãy nói ngắn hơn.");

        ScriptLine line = script.get(lineIndex);
        // Transcribe freely first: assessment against the script would bend the learner's own words
        // (e.g. a replaced free part) back into the script. Score against what they actually said.
        String spoken = azure.recognize(wav);
        if (spoken == null || normalize(spoken).isEmpty())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Chưa nghe rõ câu bạn nói. Hãy nói to, rõ hơn rồi thử lại.");
        String reference = normalize(spoken).equals(normalize(line.text())) ? line.text() : spoken;
        var assessment = azure.assess(wav, reference);
        if (assessment == null || assessment.words().isEmpty())
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Chưa nghe rõ câu bạn nói. Hãy nói to, rõ hơn rồi thử lại.");

        boolean hasFree = line.segments().stream().anyMatch(s -> Boolean.TRUE.equals(s.free()));
        String fixed = line.fixedText();
        List<WordScore> words = assessment.words().stream().map(w -> new WordScore(w.text(), w.accuracy(),
                hasFree && !fixed.contains(w.text()) ? Boolean.TRUE : null)).toList();
        TurnResult scored = new TurnResult(lineIndex, assessment.recognizedText(), words, assessment.accuracy(),
                assessment.fluency(), assessment.completeness(), assessment.pronScore(), null);

        var review = feedback.reviewTurn(session.context(), lineIndex, scored);
        TurnResult turn = review == null ? scored : new TurnResult(lineIndex, scored.recognizedText(), words,
                scored.accuracy(), scored.fluency(), scored.completeness(), scored.pronScore(), review.value());

        tx.executeWithoutResult(status -> {
            var rows = jdbc.queryForList(
                    "SELECT status, turns_data FROM speaking_session WHERE id = ? FOR UPDATE", sessionId);
            if (!"IN_PROGRESS".equals(rows.getFirst().get("status")))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiên luyện nói này đã kết thúc.");
            List<TurnResult> turns = new ArrayList<>(readTurns((String) rows.getFirst().get("turns_data")));
            turns.removeIf(t -> t.lineIndex() == lineIndex);
            turns.add(turn);
            turns.sort(Comparator.comparingInt(TurnResult::lineIndex));
            jdbc.update("""
                    UPDATE speaking_session SET turns_data = ?, turn_count = ?,
                      input_tokens = input_tokens + ?, output_tokens = output_tokens + ? WHERE id = ?
                    """, write(turns), turns.size(), review == null ? 0 : review.inputTokens(),
                    review == null ? 0 : review.outputTokens(), sessionId);
        });
        return turn;
    }

    /** Ends the session with an overall review. Finishing twice returns the same result. */
    public SessionResult finish(long sessionId, String email) {
        Session session = session(sessionId, userId(email));
        if ("COMPLETED".equals(session.status())) return result(session);
        if (!"IN_PROGRESS".equals(session.status()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phiên luyện nói này đã kết thúc.");
        if (session.turns().isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn cần nói ít nhất một câu trước khi kết thúc.");

        var review = feedback.reviewSession(session.context(), session.turns(),
                average(session.turns(), TurnResult::pronScore));
        jdbc.update("""
                UPDATE speaking_session SET status = 'COMPLETED', ended_at = NOW(), overall_feedback = ?,
                  input_tokens = input_tokens + ?, output_tokens = output_tokens + ?
                WHERE id = ? AND status = 'IN_PROGRESS'
                """, review == null ? null : review.value(), review == null ? 0 : review.inputTokens(),
                review == null ? 0 : review.outputTokens(), sessionId);
        return result(session(sessionId, session.userId()));
    }

    public SessionResult get(long sessionId, String email) {
        return result(session(sessionId, userId(email)));
    }

    private SessionResult result(Session session) {
        List<TurnResult> turns = session.turns();
        List<WordScore> weak = turns.stream().flatMap(t -> t.words().stream())
                .filter(w -> w.accuracy() < WEAK_WORD_SCORE)
                .sorted(Comparator.comparingDouble(WordScore::accuracy)).limit(MAX_WEAK_WORDS).toList();
        return new SessionResult(session.id(), session.scenarioId(), session.context().title(), turns.size(),
                average(turns, TurnResult::pronScore), average(turns, TurnResult::accuracy),
                average(turns, TurnResult::fluency), average(turns, TurnResult::completeness),
                session.overallFeedback(), weak);
    }

    private record Session(long id, long userId, long scenarioId, String status, String overallFeedback,
            List<TurnResult> turns, SpeakingFeedbackClient.Context context) {}

    /** Loads a session of {@code userId}; another learner's session is reported as not found. */
    private Session session(long sessionId, long userId) {
        var sessions = jdbc.query("""
                SELECT s.id, s.user_id, s.scenario_id, s.status, s.overall_feedback, s.turns_data, s.swapped,
                  sc.title, sc.situation, sc.ai_role, sc.student_role, sc.sample_script
                FROM speaking_session s JOIN speaking_scenario sc ON sc.id = s.scenario_id
                WHERE s.id = ? AND s.user_id = ?
                """, (rs, row) -> {
            List<ScriptLine> script = readScript(rs.getString("sample_script"));
            boolean swapped = rs.getBoolean("swapped");
            // A swapped session is the same conversation seen from the other side, so turn validation,
            // scoring and the feedback prompts all work on the swapped script unchanged.
            var context = swapped
                    ? new SpeakingFeedbackClient.Context(rs.getString("title"), rs.getString("situation"),
                            rs.getString("student_role"), rs.getString("ai_role"), swapSpeakers(script))
                    : new SpeakingFeedbackClient.Context(rs.getString("title"), rs.getString("situation"),
                            rs.getString("ai_role"), rs.getString("student_role"), script);
            return new Session(rs.getLong("id"), rs.getLong("user_id"), rs.getLong("scenario_id"),
                    rs.getString("status"), rs.getString("overall_feedback"), readTurns(rs.getString("turns_data")),
                    context);
        }, sessionId, userId);
        if (sessions.isEmpty()) throw notFound("Không tìm thấy phiên luyện nói.");
        return sessions.getFirst();
    }

    private static List<ScriptLine> swapSpeakers(List<ScriptLine> script) {
        return script.stream().map(l -> new ScriptLine("AI".equals(l.speaker()) ? "STUDENT" : "AI",
                l.segments(), l.translation(), l.hint())).toList();
    }

    private long userId(String email) {
        var ids = jdbc.queryForList("SELECT id FROM user_account WHERE email = ?", Long.class, email);
        if (ids.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản.");
        return ids.getFirst();
    }

    private List<ScriptLine> readScript(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            return json.readValue(value, SCRIPT).stream()
                    .filter(l -> l.segments() != null && !l.segments().isEmpty()).toList();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid speaking_scenario.sample_script", e);
        }
    }

    private List<TurnResult> readTurns(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            return json.readValue(value, TURNS);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid speaking_session.turns_data", e);
        }
    }

    private String write(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Text without punctuation or spaces, for comparing what was said with the script. */
    static String normalize(String text) {
        return text == null ? "" : text.replaceAll("[\\p{P}\\p{S}\\p{Z}\\s]", "");
    }

    private static double average(List<TurnResult> turns, ToDoubleFunction<TurnResult> score) {
        if (turns.isEmpty()) return 0;
        double mean = turns.stream().mapToDouble(score).average().orElse(0);
        return Math.round(mean * 10) / 10.0;
    }

    private static ResponseStatusException notFound(String message) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
    }
}
