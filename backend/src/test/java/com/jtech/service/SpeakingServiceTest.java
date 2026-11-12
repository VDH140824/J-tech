package com.jtech.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.SpeakingResponses.Scenario;
import com.jtech.dto.response.SpeakingResponses.SessionResult;
import com.jtech.dto.response.SpeakingResponses.TurnFeedback;
import com.jtech.dto.response.SpeakingResponses.TurnResult;
import com.jtech.dto.response.SpeakingResponses.WordScore;
import com.jtech.service.AzurePronunciationClient.Assessment;
import com.jtech.service.AzurePronunciationClient.Word;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.mockito.ArgumentCaptor;
import org.mockito.invocation.Invocation;
import org.mockito.stubbing.Answer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SpeakingServiceTest {
    private static final String EMAIL = "student@test.local";
    private static final long USER_ID = 7L;
    private static final long OTHER_USER_ID = 8L;
    private static final long CHAPTER_ID = 5L;
    private static final long SCENARIO_ID = 3L;
    private static final long SESSION_ID = 10L;
    private static final byte[] WAV = new byte[2048];
    /** Line 0 and 2 are AI lines; line 1 and 3 are learner lines; お水 in line 1 is replaceable. */
    private static final String SCRIPT = """
            [{"speaker":"AI","segments":[{"text":"いらっしゃいませ。"}],"translation":"Xin mời vào."},
             {"speaker":"STUDENT","segments":[{"text":"お水","free":true},{"text":"をください。"}],
              "translation":"Cho tôi nước.","hint":"オレンジジュース"},
             {"speaker":"AI","segments":[{"text":"かしこまりました。"}],"translation":"Vâng ạ."},
             {"speaker":"STUDENT","segments":[{"text":"ありがとうございます。"}],"translation":"Cảm ơn."}]
            """;
    private static final String STUDENT_ONLY_SCRIPT = """
            [{"speaker":"STUDENT","segments":[{"text":"こんにちは。"}],"translation":"Xin chào."}]
            """;
    private static final String AI_ONLY_SCRIPT = """
            [{"speaker":"AI","segments":[{"text":"こんにちは。"}],"translation":"Xin chào."}]
            """;

    private final ObjectMapper json = new ObjectMapper();
    private JdbcTemplate jdbc;
    private AzurePronunciationClient azure;
    private SpeakingFeedbackClient feedback;
    private SpeakingService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        jdbc = mock(JdbcTemplate.class);
        azure = mock(AzurePronunciationClient.class);
        feedback = mock(SpeakingFeedbackClient.class);
        TransactionTemplate tx = mock(TransactionTemplate.class);
        doAnswer(invocation -> {
            invocation.<Consumer<TransactionStatus>>getArgument(0).accept(null);
            return null;
        }).when(tx).executeWithoutResult(any());
        when(jdbc.queryForList(eq("SELECT id FROM user_account WHERE email = ?"), eq(Long.class), eq(EMAIL)))
                .thenReturn(List.of(USER_ID));
        service = new SpeakingService(jdbc, json, tx, azure, feedback);
    }

    // ---- Scenario list ----

    @Test
    void unpublishedChapterIsNotFound() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(CHAPTER_ID))).thenReturn(0);

        assertStatus(404, "Không tìm thấy chương học.", () -> service.scenarios(CHAPTER_ID, EMAIL));

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).queryForObject(sql.capture(), eq(Integer.class), eq(CHAPTER_ID));
        assertTrue(sql.getValue().contains("c.status = 'PUBLISHED'"));
        assertTrue(sql.getValue().contains("co.status = 'PUBLISHED' AND co.deleted_at IS NULL"));
        verify(jdbc, never()).query(anyString(), any(RowMapper.class), eq(USER_ID), eq(CHAPTER_ID));
    }

    @Test
    @SuppressWarnings("unchecked")
    void scenarioListReadsOnlyPublishedScenariosInDisplayOrderAndSkipsScriptsWithoutLearnerLines() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(CHAPTER_ID))).thenReturn(1);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(USER_ID), eq(CHAPTER_ID))).thenAnswer(rows(
                scenarioRow(2, "Gọi món", SCRIPT, 0),
                scenarioRow(1, "Chỉ có AI", AI_ONLY_SCRIPT, 0),
                scenarioRow(4, "Chào hỏi", STUDENT_ONLY_SCRIPT, 0)));

        List<Scenario> scenarios = service.scenarios(CHAPTER_ID, EMAIL);

        assertEquals(List.of(2L, 4L), scenarios.stream().map(Scenario::id).toList());
        assertEquals(4, scenarios.getFirst().script().size());
        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(USER_ID), eq(CHAPTER_ID));
        assertTrue(sql.getValue().contains("sc.chapter_id = ? AND sc.status = 'PUBLISHED'"));
        assertTrue(sql.getValue().contains("ORDER BY sc.display_order, sc.id"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void completedCountOnlyCountsCompletedSessionsOfTheCurrentLearner() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(CHAPTER_ID))).thenReturn(1);
        when(jdbc.query(anyString(), any(RowMapper.class), eq(USER_ID), eq(CHAPTER_ID)))
                .thenAnswer(rows(scenarioRow(2, "Gọi món", SCRIPT, 3)));

        assertEquals(3, service.scenarios(CHAPTER_ID, EMAIL).getFirst().completedCount());

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).query(sql.capture(), any(RowMapper.class), eq(USER_ID), eq(CHAPTER_ID));
        assertTrue(sql.getValue().contains("s.scenario_id = sc.id AND s.user_id = ?"));
        assertTrue(sql.getValue().contains("s.status = 'COMPLETED'"));
    }

    // ---- Starting a session ----

    @Test
    void startStoresANormalSession() throws SQLException {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(SCENARIO_ID))).thenReturn(List.of(SCRIPT));
        PreparedStatement statement = stubInsert(99L);

        assertEquals(99L, service.start(SCENARIO_ID, false, EMAIL).id());

        verify(statement).setLong(1, USER_ID);
        verify(statement).setLong(2, SCENARIO_ID);
        verify(statement).setBoolean(3, false);
    }

    @Test
    void startStoresASwappedSessionWhenTheScriptHasAiLines() throws SQLException {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(SCENARIO_ID))).thenReturn(List.of(SCRIPT));
        PreparedStatement statement = stubInsert(100L);

        assertEquals(100L, service.start(SCENARIO_ID, true, EMAIL).id());

        verify(statement).setBoolean(3, true);
    }

    @Test
    void startRejectsMissingOrUnpublishedScenarios() {
        when(jdbc.queryForList(anyString(), eq(String.class), eq(SCENARIO_ID))).thenReturn(List.of());
        assertStatus(404, "Không tìm thấy tình huống luyện nói.", () -> service.start(SCENARIO_ID, false, EMAIL));

        when(jdbc.queryForList(anyString(), eq(String.class), eq(SCENARIO_ID)))
                .thenReturn(List.of(STUDENT_ONLY_SCRIPT));
        assertStatus(404, "Không tìm thấy tình huống luyện nói.", () -> service.start(SCENARIO_ID, true, EMAIL));

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(2)).queryForList(sql.capture(), eq(String.class), eq(SCENARIO_ID));
        assertTrue(sql.getValue().contains("sc.status = 'PUBLISHED'"));
        verify(jdbc, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    // ---- Turn validation ----

    @Test
    @SuppressWarnings("unchecked")
    void anotherLearnersSessionIsNotFound() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(SESSION_ID), eq(OTHER_USER_ID)))
                .thenAnswer(rows(sessionRow("IN_PROGRESS", false, null, null)));

        assertStatus(404, "Không tìm thấy phiên luyện nói.", () -> service.submitTurn(SESSION_ID, 1, WAV, EMAIL));

        verify(jdbc).query(contains("WHERE s.id = ? AND s.user_id = ?"), any(RowMapper.class),
                eq(SESSION_ID), eq(USER_ID));
        verifyNoInteractions(azure, feedback);
    }

    @Test
    void finishedSessionRejectsNewTurns() {
        givenSession(sessionRow("COMPLETED", false, null, null));

        assertStatus(409, null, () -> service.submitTurn(SESSION_ID, 1, WAV, EMAIL));
        verifyNoInteractions(azure, feedback);
    }

    @Test
    void lineIndexOutsideTheScriptIsRejected() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));

        for (int index : new int[] {-1, 4, 99})
            assertStatus(400, "Dòng này không phải lượt nói của bạn.",
                    () -> service.submitTurn(SESSION_ID, index, WAV, EMAIL));
        verifyNoInteractions(azure, feedback);
    }

    @Test
    void aiLineIsNotTheLearnersTurn() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));

        assertStatus(400, "Dòng này không phải lượt nói của bạn.", () -> service.submitTurn(SESSION_ID, 0, WAV, EMAIL));
        assertStatus(400, "Dòng này không phải lượt nói của bạn.", () -> service.submitTurn(SESSION_ID, 2, WAV, EMAIL));
        verifyNoInteractions(azure, feedback);
    }

    @Test
    void swappedSessionRejectsTheOriginalLearnerLine() {
        givenSession(sessionRow("IN_PROGRESS", true, null, null));

        assertStatus(400, "Dòng này không phải lượt nói của bạn.", () -> service.submitTurn(SESSION_ID, 1, WAV, EMAIL));
        verifyNoInteractions(azure, feedback);
    }

    @Test
    void swappedSessionAcceptsTheOriginalAiLine() {
        givenSession(sessionRow("IN_PROGRESS", true, null, null));
        givenLockedSession("IN_PROGRESS", null);
        when(azure.recognize(WAV)).thenReturn("いらっしゃいませ");
        when(azure.assess(WAV, "いらっしゃいませ。")).thenReturn(assessment("いらっしゃいませ", word("いらっしゃいませ", 92)));

        TurnResult turn = service.submitTurn(SESSION_ID, 0, WAV, EMAIL);

        assertEquals(0, turn.lineIndex());
        verify(azure).assess(WAV, "いらっしゃいませ。");
    }

    // ---- Scoring ----

    @Test
    void unrecognisedSpeechIsRejectedBeforeAssessment() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));

        for (String spoken : new String[] {null, "", "。、！ 　"}) {
            when(azure.recognize(WAV)).thenReturn(spoken);
            assertStatus(422, "Chưa nghe rõ câu bạn nói. Hãy nói to, rõ hơn rồi thử lại.",
                    () -> service.submitTurn(SESSION_ID, 1, WAV, EMAIL));
        }
        verify(azure, never()).assess(any(), any());
        verifyNoInteractions(feedback);
    }

    @Test
    void speechMatchingTheScriptIsAssessedAgainstTheScriptLine() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));
        givenLockedSession("IN_PROGRESS", null);
        when(azure.recognize(WAV)).thenReturn("お水を　ください！");
        when(azure.assess(eq(WAV), anyString())).thenReturn(assessment("お水をください", word("お水", 90)));

        service.submitTurn(SESSION_ID, 1, WAV, EMAIL);

        verify(azure).assess(WAV, "お水をください。");
    }

    @Test
    void speechDifferentFromTheScriptIsAssessedAgainstWhatWasSaid() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));
        givenLockedSession("IN_PROGRESS", null);
        when(azure.recognize(WAV)).thenReturn("オレンジジュースをください。");
        when(azure.assess(eq(WAV), anyString())).thenReturn(assessment("オレンジジュースをください。",
                word("オレンジジュース", 70), word("を", 95), word("ください", 90)));

        TurnResult turn = service.submitTurn(SESSION_ID, 1, WAV, EMAIL);

        verify(azure).assess(WAV, "オレンジジュースをください。");
        assertEquals(Boolean.TRUE, turn.words().get(0).free());
        assertNull(turn.words().get(1).free());
    }

    @Test
    void assessmentWithoutWordsIsRejected() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));
        when(azure.recognize(WAV)).thenReturn("お水をください");

        when(azure.assess(eq(WAV), anyString())).thenReturn(null);
        assertStatus(422, null, () -> service.submitTurn(SESSION_ID, 1, WAV, EMAIL));

        when(azure.assess(eq(WAV), anyString())).thenReturn(assessment("お水をください"));
        assertStatus(422, null, () -> service.submitTurn(SESSION_ID, 1, WAV, EMAIL));

        verifyNoInteractions(feedback);
        assertTrue(updates("UPDATE speaking_session SET turns_data").isEmpty());
    }

    @Test
    void turnIsSavedWithoutFeedbackWhenGeminiDoesNotAnswer() throws Exception {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));
        givenLockedSession("IN_PROGRESS", null);
        givenSpokenLine1();
        when(feedback.reviewTurn(any(), eq(1), any())).thenReturn(null);

        TurnResult turn = service.submitTurn(SESSION_ID, 1, WAV, EMAIL);

        assertNull(turn.feedback());
        Object[] args = singleUpdate("UPDATE speaking_session SET turns_data");
        List<TurnResult> saved = turns((String) args[1]);
        assertEquals(1, saved.size());
        assertNull(saved.getFirst().feedback());
        assertEquals(List.of(1, 0, 0, SESSION_ID), List.of(args).subList(2, 6));
    }

    // ---- Saving turns ----

    @Test
    void firstTurnIsSavedWithItsTokenUsage() throws Exception {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));
        givenLockedSession("IN_PROGRESS", null);
        givenSpokenLine1();
        var review = new TurnFeedback("FOLLOWS_SCRIPT", "Đúng câu mẫu.", null, List.of());
        when(feedback.reviewTurn(any(), eq(1), any())).thenReturn(new SpeakingFeedbackClient.Reply<>(review, 120, 30));

        TurnResult turn = service.submitTurn(SESSION_ID, 1, WAV, EMAIL);

        assertEquals(review, turn.feedback());
        Object[] args = singleUpdate("UPDATE speaking_session SET turns_data");
        List<TurnResult> saved = turns((String) args[1]);
        assertEquals(List.of(turn), saved);
        assertEquals(List.of(1, 120, 30, SESSION_ID), List.of(args).subList(2, 6));
    }

    @Test
    void resendingALineReplacesItsEarlierTurn() throws Exception {
        String earlier = json.writeValueAsString(List.of(
                turn(3, "ありがとうございます", 88), turn(1, "お水をくだしゃい", 60)));
        givenSession(sessionRow("IN_PROGRESS", false, earlier, null));
        givenLockedSession("IN_PROGRESS", earlier);
        givenSpokenLine1();

        service.submitTurn(SESSION_ID, 1, WAV, EMAIL);

        Object[] args = singleUpdate("UPDATE speaking_session SET turns_data");
        List<TurnResult> saved = turns((String) args[1]);
        assertEquals(List.of(1, 3), saved.stream().map(TurnResult::lineIndex).toList());
        assertEquals("お水をください", saved.getFirst().recognizedText());
        assertEquals(2, args[2]);
    }

    // ---- Finishing ----

    @Test
    void finishCompletesTheSessionWithAnOverallReview() throws Exception {
        String turns = json.writeValueAsString(List.of(turn(1, "お水をください", 80), turn(3, "ありがとう", 91)));
        givenSession(sessionRow("IN_PROGRESS", false, turns, null), sessionRow("COMPLETED", false, turns, "Phát âm tốt."));
        when(feedback.reviewSession(any(), anyList(), eq(85.5)))
                .thenReturn(new SpeakingFeedbackClient.Reply<>("Phát âm tốt.", 50, 20));

        SessionResult result = service.finish(SESSION_ID, EMAIL);

        Object[] args = singleUpdate("UPDATE speaking_session SET status = 'COMPLETED'");
        assertTrue(((String) args[0]).contains("ended_at = NOW()"));
        assertEquals(List.of("Phát âm tốt.", 50, 20, SESSION_ID), List.of(args).subList(1, 5));
        assertEquals("Phát âm tốt.", result.overallFeedback());
        assertEquals(2, result.turnCount());
        assertEquals(85.5, result.pronScore());
    }

    @Test
    void finishingTwiceReturnsTheSavedResultWithoutCallingGemini() throws Exception {
        String turns = json.writeValueAsString(List.of(turn(1, "お水をください", 80)));
        givenSession(sessionRow("COMPLETED", false, turns, "Đã tổng kết."));

        SessionResult result = service.finish(SESSION_ID, EMAIL);

        assertEquals("Đã tổng kết.", result.overallFeedback());
        verifyNoInteractions(feedback);
        assertTrue(updates("UPDATE speaking_session").isEmpty());
    }

    @Test
    void sessionWithoutTurnsCannotBeFinished() {
        givenSession(sessionRow("IN_PROGRESS", false, null, null));

        assertStatus(400, "Bạn cần nói ít nhất một câu trước khi kết thúc.", () -> service.finish(SESSION_ID, EMAIL));
        verifyNoInteractions(feedback);
        assertTrue(updates("UPDATE speaking_session").isEmpty());
    }

    @Test
    void finishCompletesTheSessionEvenWithoutAnOverallReview() throws Exception {
        String turns = json.writeValueAsString(List.of(turn(1, "お水をください", 80)));
        givenSession(sessionRow("IN_PROGRESS", false, turns, null), sessionRow("COMPLETED", false, turns, null));
        when(feedback.reviewSession(any(), anyList(), anyDouble())).thenReturn(null);

        SessionResult result = service.finish(SESSION_ID, EMAIL);

        Object[] args = singleUpdate("UPDATE speaking_session SET status = 'COMPLETED'");
        assertEquals(Arrays.asList(null, 0, 0, SESSION_ID), Arrays.asList(args).subList(1, 5));
        assertNull(result.overallFeedback());
    }

    // ---- Reading a result ----

    @Test
    @SuppressWarnings("unchecked")
    void anotherLearnersResultIsNotFound() {
        when(jdbc.query(anyString(), any(RowMapper.class), eq(SESSION_ID), eq(OTHER_USER_ID)))
                .thenAnswer(rows(sessionRow("COMPLETED", false, null, "Bí mật")));

        assertStatus(404, "Không tìm thấy phiên luyện nói.", () -> service.get(SESSION_ID, EMAIL));
    }

    // ---- Helpers ----

    private static void assertStatus(int status, String reason, Executable call) {
        var error = assertThrows(ResponseStatusException.class, call);
        assertEquals(status, error.getStatusCode().value());
        if (reason != null) assertEquals(reason, error.getReason());
    }

    @SuppressWarnings("unchecked")
    private void givenSession(Map<String, Object> first, Map<String, Object>... later) {
        var stub = when(jdbc.query(contains("FROM speaking_session s JOIN"), any(RowMapper.class),
                eq(SESSION_ID), eq(USER_ID))).thenAnswer(rows(first));
        for (var row : later) stub = stub.thenAnswer(rows(row));
    }

    private void givenLockedSession(String status, String turnsData) {
        Map<String, Object> row = new HashMap<>();
        row.put("status", status);
        row.put("turns_data", turnsData);
        when(jdbc.queryForList(contains("FOR UPDATE"), eq(SESSION_ID))).thenReturn(List.of(row));
    }

    private void givenSpokenLine1() {
        when(azure.recognize(WAV)).thenReturn("お水をください");
        when(azure.assess(eq(WAV), anyString())).thenReturn(assessment("お水をください",
                word("お水", 90), word("を", 95), word("ください", 70)));
    }

    private PreparedStatement stubInsert(long id) throws SQLException {
        PreparedStatement statement = mock(PreparedStatement.class);
        Connection connection = mock(Connection.class);
        when(connection.prepareStatement(contains("INSERT INTO speaking_session (user_id, scenario_id, swapped)"),
                anyInt())).thenReturn(statement);
        when(jdbc.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(invocation -> {
            invocation.<PreparedStatementCreator>getArgument(0).createPreparedStatement(connection);
            invocation.<KeyHolder>getArgument(1).getKeyList().add(Map.of("GENERATED_KEY", id));
            return 1;
        });
        return statement;
    }

    /** Arguments (SQL first) of every JdbcTemplate.update(String, Object...) call whose SQL contains {@code part}. */
    private List<Object[]> updates(String part) {
        List<Object[]> calls = new ArrayList<>();
        for (Invocation invocation : mockingDetails(jdbc).getInvocations()) {
            Object[] args = invocation.getArguments();
            if (invocation.getMethod().getName().equals("update") && args.length > 0
                    && args[0] instanceof String sql && sql.contains(part))
                calls.add(args);
        }
        return calls;
    }

    private Object[] singleUpdate(String part) {
        List<Object[]> calls = updates(part);
        assertEquals(1, calls.size(), "updates matching " + part);
        return calls.getFirst();
    }

    private List<TurnResult> turns(String value) throws Exception {
        return json.readValue(value, new TypeReference<>() {});
    }

    private static Answer<List<Object>> rows(Map<String, Object>... rows) {
        return invocation -> {
            RowMapper<?> mapper = invocation.getArgument(1);
            List<Object> mapped = new ArrayList<>();
            for (int i = 0; i < rows.length; i++) mapped.add(mapper.mapRow(resultSet(rows[i]), i));
            return mapped;
        };
    }

    private static ResultSet resultSet(Map<String, Object> row) throws SQLException {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString(anyString())).thenAnswer(i -> (String) row.get(i.<String>getArgument(0)));
        when(rs.getLong(anyString())).thenAnswer(i -> ((Number) row.getOrDefault(i.<String>getArgument(0), 0)).longValue());
        when(rs.getInt(anyString())).thenAnswer(i -> ((Number) row.getOrDefault(i.<String>getArgument(0), 0)).intValue());
        when(rs.getBoolean(anyString())).thenAnswer(i -> Boolean.TRUE.equals(row.get(i.<String>getArgument(0))));
        return rs;
    }

    private static Map<String, Object> scenarioRow(long id, String title, String script, int completed) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("chapter_id", CHAPTER_ID);
        row.put("title", title);
        row.put("situation", "Ở nhà hàng");
        row.put("ai_role", "Nhân viên");
        row.put("student_role", "Khách");
        row.put("sample_script", script);
        row.put("completed_count", completed);
        return row;
    }

    private static Map<String, Object> sessionRow(String status, boolean swapped, String turns, String overall) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", SESSION_ID);
        row.put("user_id", USER_ID);
        row.put("scenario_id", SCENARIO_ID);
        row.put("status", status);
        row.put("overall_feedback", overall);
        row.put("turns_data", turns);
        row.put("swapped", swapped);
        row.put("title", "Gọi món");
        row.put("situation", "Ở nhà hàng");
        row.put("ai_role", "Nhân viên");
        row.put("student_role", "Khách");
        row.put("sample_script", SCRIPT);
        return row;
    }

    private static Word word(String text, double accuracy) {
        return new Word(text, accuracy);
    }

    private static Assessment assessment(String text, Word... words) {
        return new Assessment(text, List.of(words), 85, 80, 100, 84);
    }

    private static TurnResult turn(int line, String text, double pronScore) {
        return new TurnResult(line, text, List.of(new WordScore(text, pronScore, null)),
                pronScore, pronScore, 100, pronScore, null);
    }
}
