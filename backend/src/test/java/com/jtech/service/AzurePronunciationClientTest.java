package com.jtech.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.net.http.HttpClient;

import static com.jtech.service.SpeakingFeedbackClientTest.response;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AzurePronunciationClientTest {
    private static final byte[] WAV = new byte[2048];

    private final HttpClient http = mock(HttpClient.class);

    @Test
    void noSpeechMeansNoRecognitionAndNoAssessment() throws Exception {
        doReturn(response(200, "{\"RecognitionStatus\":\"NoMatch\"}")).when(http).send(any(), any());
        var client = client("test-key", "japaneast");

        assertNull(client.recognize(WAV));
        assertNull(client.assess(WAV, "お水をください。"));
    }

    @Test
    void successfulAssessmentReadsScoresAndSkipsInsertedWords() throws Exception {
        doReturn(response(200, """
                {"RecognitionStatus":"Success","DisplayText":"お水をください。",
                 "NBest":[{"AccuracyScore":90,"FluencyScore":80,"CompletenessScore":100,"PronScore":88,
                   "Words":[{"Word":"お水","AccuracyScore":95,"ErrorType":"None"},
                            {"Word":"え","AccuracyScore":0,"ErrorType":"Insertion"},
                            {"Word":"ください","AccuracyScore":70,"ErrorType":"None"}]}]}
                """)).when(http).send(any(), any());

        var assessment = client("test-key", "japaneast").assess(WAV, "お水をください。");

        assertEquals("お水をください。", assessment.recognizedText());
        assertEquals(2, assessment.words().size());
        assertEquals(70, assessment.words().get(1).accuracy());
        assertEquals(88, assessment.pronScore());
    }

    @Test
    void azureErrorIsReportedAsBadGateway() throws Exception {
        doReturn(response(401, "{\"error\":\"unauthorized\"}")).when(http).send(any(), any());

        var error = assertThrows(ResponseStatusException.class, () -> client("test-key", "japaneast").recognize(WAV));
        assertEquals(502, error.getStatusCode().value());
    }

    @Test
    void missingConfigurationIsReportedWithoutCallingAzure() throws Exception {
        var error = assertThrows(ResponseStatusException.class, () -> client("", "japaneast").recognize(WAV));
        assertEquals(503, error.getStatusCode().value());
        verifyNoInteractions(http);
    }

    private AzurePronunciationClient client(String key, String region) throws Exception {
        var client = new AzurePronunciationClient(new ObjectMapper(), key, region, "ja-JP");
        Field field = AzurePronunciationClient.class.getDeclaredField("http");
        field.setAccessible(true);
        field.set(client, http);
        return client;
    }
}
