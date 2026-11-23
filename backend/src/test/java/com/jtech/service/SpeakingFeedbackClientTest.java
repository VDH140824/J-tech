package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.SpeakingResponses.ScriptLine;
import com.jtech.dto.response.SpeakingResponses.ScriptSegment;
import com.jtech.dto.response.SpeakingResponses.TurnResult;
import com.jtech.dto.response.SpeakingResponses.WordScore;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Field;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.Flow;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SpeakingFeedbackClientTest {
    private static final String OK_BODY = """
            {"candidates":[{"content":{"parts":[{"text":"{\\"feedback\\":\\"Tốt lắm\\"}"}]}}],
             "usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":5}}
            """;
    private static final SpeakingFeedbackClient.Context CONTEXT = new SpeakingFeedbackClient.Context(
            "Gọi món", "Ở nhà hàng", "Nhân viên", "Khách",
            List.of(new ScriptLine("STUDENT", List.of(new ScriptSegment("お水をください。", null)), "Cho tôi nước.", null)));
    private static final List<TurnResult> TURNS = List.of(new TurnResult(0, "お水をください",
            List.of(new WordScore("お水", 90, null)), 90, 85, 100, 88, null));

    private final HttpClient http = mock(HttpClient.class);

    @Test
    void blankApiKeySkipsGemini() throws Exception {
        var client = client("  ");

        assertNull(client.reviewSession(CONTEXT, TURNS, 88));
        verifyNoInteractions(http);
    }

    @Test
    void successfulReplyCarriesFeedbackAndTokenUsage() throws Exception {
        doReturn(response(200, OK_BODY)).when(http).send(any(), any());

        var reply = client("test-key").reviewSession(CONTEXT, TURNS, 88);

        assertEquals("Tốt lắm", reply.value());
        assertEquals(12, reply.inputTokens());
        assertEquals(5, reply.outputTokens());
    }

    @Test
    void modelRejectingThinkingConfigIsRetriedWithoutItAndRemembered() throws Exception {
        doReturn(response(400, "{\"error\":\"thinking not supported\"}"), response(200, OK_BODY), response(200, OK_BODY))
                .when(http).send(any(), any());
        var client = client("test-key");

        assertEquals("Tốt lắm", client.reviewSession(CONTEXT, TURNS, 88).value());
        assertEquals("Tốt lắm", client.reviewSession(CONTEXT, TURNS, 88).value());

        var requests = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http, times(3)).send(requests.capture(), any());
        List<String> bodies = requests.getAllValues().stream().map(SpeakingFeedbackClientTest::body).toList();
        assertTrue(bodies.get(0).contains("thinkingConfig"));
        assertFalse(bodies.get(1).contains("thinkingConfig"));
        assertFalse(bodies.get(2).contains("thinkingConfig"), "later calls skip thinkingConfig");
    }

    @Test
    void serverErrorReturnsNoFeedback() throws Exception {
        doReturn(response(500, "{\"error\":\"internal\"}")).when(http).send(any(), any());

        assertNull(client("test-key").reviewSession(CONTEXT, TURNS, 88));
    }

    @Test
    void networkFailureOrTimeoutReturnsNoFeedback() throws Exception {
        when(http.send(any(), any())).thenThrow(new IOException("connection reset"));
        assertNull(client("test-key").reviewSession(CONTEXT, TURNS, 88));

        reset(http);
        when(http.send(any(), any())).thenThrow(new HttpTimeoutException("request timed out"));
        assertNull(client("test-key").reviewSession(CONTEXT, TURNS, 88));
    }

    @Test
    void emptyFeedbackIsTreatedAsNoFeedback() throws Exception {
        doReturn(response(200, """
                {"candidates":[{"content":{"parts":[{"text":"{\\"feedback\\":\\"  \\"}"}]}}]}
                """)).when(http).send(any(), any());

        assertNull(client("test-key").reviewSession(CONTEXT, TURNS, 88));
    }

    @Test
    void turnReviewIsGivenTheLineBeingAnsweredAndDecidesTheVerdictLast() throws Exception {
        doReturn(response(200, """
                {"candidates":[{"content":{"parts":[{"text":"{\\"comment\\":\\"Lạc đề\\",\\"suggestion\\":\\"一人です。\\",\\"tips\\":[],\\"verdict\\":\\"OFF_TOPIC\\"}"}]}}]}
                """)).when(http).send(any(), any());
        var context = new SpeakingFeedbackClient.Context("Gọi món", "Ở quán ramen", "Nhân viên", "Khách", List.of(
                new ScriptLine("AI", List.of(new ScriptSegment("いらっしゃいませ。何名様ですか？", null)), "Mấy người ạ?", null),
                new ScriptLine("STUDENT", List.of(new ScriptSegment("一人", true), new ScriptSegment("です。", null)), "Một người.", null)));
        var turn = new TurnResult(1, "ああ何をしますか", List.of(new WordScore("何", 68, null)), 87, 99, 100, 92, null);

        var reply = client("test-key").reviewTurn(context, 1, turn);

        assertEquals(SpeakingFeedbackClient.OFF_TOPIC, reply.value().verdict());
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(request.capture(), any());
        String body = body(request.getValue());
        assertTrue(body.contains("vừa nói ngay trước lượt này: いらっしゃいませ。何名様ですか？"));
        assertTrue(body.contains("\"propertyOrdering\":[\"comment\",\"suggestion\",\"tips\",\"verdict\"]"));
        assertTrue(body.contains("\"OFF_TOPIC\""), "the schema offers the off-topic verdict");
    }

    @Test
    void tipsForWordsNotSpokenOrWithoutAFixAreDropped() throws Exception {
        String tips = "[{\\\"word\\\":\\\"お水\\\",\\\"issue\\\":\\\"thiếu trường âm\\\",\\\"fix\\\":\\\"kéo dài\\\"},"
                + "{\\\"word\\\":\\\"ジュース\\\",\\\"issue\\\":\\\"không có trong câu\\\",\\\"fix\\\":\\\"x\\\"},"
                + "{\\\"word\\\":\\\"ください\\\",\\\"issue\\\":\\\"đọc nhanh\\\",\\\"fix\\\":\\\"\\\"}]";
        doReturn(response(200, """
                {"candidates":[{"content":{"parts":[{"text":"{\\"comment\\":\\"Đúng mẫu\\",\\"suggestion\\":\\"\\",\\"tips\\":%s,\\"verdict\\":\\"FOLLOWS_SCRIPT\\"}"}]}}]}
                """.formatted(tips))).when(http).send(any(), any());

        var reply = client("test-key").reviewTurn(CONTEXT, 0, TURNS.get(0));

        assertEquals(List.of("お水"), reply.value().tips().stream().map(t -> t.word()).toList());
    }

    @Test
    void openingLearnerLineHasNoPreviousLine() {
        assertEquals("không có (học viên mở đầu hội thoại)", SpeakingFeedbackClient.previousLine(CONTEXT, 0));
    }

    private SpeakingFeedbackClient client(String apiKey) throws Exception {
        var client = new SpeakingFeedbackClient(new ObjectMapper(), apiKey, "test-model", 5);
        Field field = SpeakingFeedbackClient.class.getDeclaredField("http");
        field.setAccessible(true);
        field.set(client, http);
        return client;
    }

    @SuppressWarnings("unchecked")
    static HttpResponse<String> response(int status, String body) {
        HttpResponse<String> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenReturn(body);
        return response;
    }

    /** Reads a request body; the JDK byte-array publishers deliver synchronously on subscribe. */
    static String body(HttpRequest request) {
        var out = new ByteArrayOutputStream();
        request.bodyPublisher().orElseThrow().subscribe(new Flow.Subscriber<>() {
            public void onSubscribe(Flow.Subscription subscription) {
                subscription.request(Long.MAX_VALUE);
            }

            public void onNext(ByteBuffer item) {
                byte[] bytes = new byte[item.remaining()];
                item.get(bytes);
                out.writeBytes(bytes);
            }

            public void onError(Throwable error) {
                throw new AssertionError(error);
            }

            public void onComplete() {}
        });
        return out.toString(StandardCharsets.UTF_8);
    }
}
