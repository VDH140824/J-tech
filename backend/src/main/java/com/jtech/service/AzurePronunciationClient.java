package com.jtech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Scores Japanese speech with Azure Speech pronunciation assessment (REST, short audio).
 * Expects 16 kHz mono 16-bit PCM WAV, which the browser produces before upload.
 */
@Component
public class AzurePronunciationClient {
    private static final Logger log = LoggerFactory.getLogger(AzurePronunciationClient.class);

    public record Word(String text, double accuracy) {}

    public record Assessment(String recognizedText, List<Word> words, double accuracy, double fluency,
            double completeness, double pronScore) {}

    private final ObjectMapper json;
    private final String key;
    private final String region;
    private final String language;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public AzurePronunciationClient(ObjectMapper json,
            @Value("${app.speaking.azure.key:}") String key,
            @Value("${app.speaking.azure.region:}") String region,
            @Value("${app.speaking.azure.language:ja-JP}") String language) {
        this.json = json;
        this.key = key;
        this.region = region;
        this.language = language;
    }

    public boolean configured() {
        return !key.isBlank() && !region.isBlank();
    }

    /**
     * Transcribes {@code wav} without a reference text. Pronunciation assessment pulls recognition
     * towards its reference, so this is the only way to learn what the learner really said.
     * Returns null when no speech was recognised.
     */
    public String recognize(byte[] wav) {
        JsonNode root = send(wav, null);
        if (!"Success".equals(root.path("RecognitionStatus").asText())) return null;
        String text = root.path("DisplayText").asText("").trim();
        return text.isEmpty() ? null : text;
    }

    /** Assesses {@code wav} against {@code referenceText}. Returns null when no speech was recognised. */
    public Assessment assess(byte[] wav, String referenceText) {
        try {
            String settings = json.writeValueAsString(Map.of(
                    "ReferenceText", referenceText,
                    "GradingSystem", "HundredMark",
                    "Granularity", "Word",
                    "Dimension", "Comprehensive"));
            return parse(send(wav, settings));
        } catch (IOException e) {
            log.warn("Azure pronunciation assessment error", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không kết nối được dịch vụ chấm phát âm.");
        }
    }

    /** Posts {@code wav} to Azure; {@code assessmentSettings} (JSON) turns on pronunciation assessment. */
    private JsonNode send(byte[] wav, String assessmentSettings) {
        if (!configured())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chức năng chấm phát âm chưa được cấu hình trên máy chủ.");
        try {
            var uri = URI.create("https://" + region + ".stt.speech.microsoft.com/speech/recognition/conversation/"
                    + "cognitiveservices/v1?format=detailed&language=" + URLEncoder.encode(language, StandardCharsets.UTF_8));
            var builder = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(30))
                    .header("Ocp-Apim-Subscription-Key", key)
                    .header("Content-Type", "audio/wav; codecs=audio/pcm; samplerate=16000")
                    .header("Accept", "application/json");
            if (assessmentSettings != null)
                builder.header("Pronunciation-Assessment",
                        Base64.getEncoder().encodeToString(assessmentSettings.getBytes(StandardCharsets.UTF_8)));
            var request = builder.POST(HttpRequest.BodyPublishers.ofByteArray(wav)).build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200) {
                log.warn("Azure speech request failed: HTTP {} {}", response.statusCode(), response.body());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Không chấm được phát âm lúc này. Hãy thử nói lại.");
            }
            return json.readTree(response.body());
        } catch (IOException e) {
            log.warn("Azure pronunciation assessment error", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Không kết nối được dịch vụ chấm phát âm.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Yêu cầu chấm phát âm bị gián đoạn.");
        }
    }

    private Assessment parse(JsonNode root) {
        if (!"Success".equals(root.path("RecognitionStatus").asText())) return null;
        JsonNode best = root.path("NBest").path(0);
        if (best.isMissingNode()) return null;
        List<Word> words = new ArrayList<>();
        for (JsonNode word : best.path("Words")) {
            // Insertions are extra words the reference does not contain; they carry no accuracy.
            if ("Insertion".equals(field(word, "ErrorType").asText())) continue;
            words.add(new Word(word.path("Word").asText(), field(word, "AccuracyScore").asDouble()));
        }
        String text = root.path("DisplayText").asText(best.path("Display").asText(""));
        return new Assessment(text, words, field(best, "AccuracyScore").asDouble(),
                field(best, "FluencyScore").asDouble(), field(best, "CompletenessScore").asDouble(),
                field(best, "PronScore").asDouble());
    }

    /**
     * The REST API puts assessment scores directly on the result and on each word,
     * while the Speech SDK nests them under "PronunciationAssessment"; accept both.
     */
    private static JsonNode field(JsonNode node, String name) {
        JsonNode direct = node.path(name);
        return direct.isMissingNode() ? node.path("PronunciationAssessment").path(name) : direct;
    }
}
