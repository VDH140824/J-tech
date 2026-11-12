package com.jtech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.dto.response.SpeakingResponses.ScriptLine;
import com.jtech.dto.response.SpeakingResponses.Tip;
import com.jtech.dto.response.SpeakingResponses.TurnFeedback;
import com.jtech.dto.response.SpeakingResponses.TurnResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Asks Gemini to review learner sentences in a speaking scenario. Every method returns null
 * (never throws) when Gemini is not configured or does not answer, so pronunciation scores
 * are still saved without a comment.
 */
@Component
public class SpeakingFeedbackClient {
    private static final Logger log = LoggerFactory.getLogger(SpeakingFeedbackClient.class);
    private static final Set<String> VERDICTS = Set.of("FOLLOWS_SCRIPT", "FITS_SITUATION", "UNNATURAL");

    /** Scenario details the prompts need. */
    public record Context(String title, String situation, String aiRole, String studentRole, List<ScriptLine> script) {}

    public record Reply<T>(T value, int inputTokens, int outputTokens) {}

    private final ObjectMapper json;
    private final String apiKey;
    private final String model;
    private final Duration timeout;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    /** Turned off once the configured model is found to reject thinkingConfig. */
    private volatile boolean sendThinkingConfig = true;

    public SpeakingFeedbackClient(ObjectMapper json,
            @Value("${app.speaking.gemini.api-key:}") String apiKey,
            @Value("${app.speaking.gemini.model:gemini-3.8-flash}") String model,
            @Value("${app.speaking.gemini.timeout-seconds:60}") long timeoutSeconds) {
        this.json = json;
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
    }

    /** Reviews what the learner said for script line {@code lineIndex}. */
    public Reply<TurnFeedback> reviewTurn(Context context, int lineIndex, TurnResult turn) {
        ScriptLine line = context.script().get(lineIndex);
        String wordScores = turn.words().stream()
                .map(w -> w.text() + " " + Math.round(w.accuracy())).collect(Collectors.joining(", "));
        String prompt = """
                Bạn là giáo viên tiếng Nhật khó tính nhưng tận tâm, chữa một câu nói của học viên người Việt trong bài luyện hội thoại nhập vai.
                %s
                Câu học viên cần nói (dòng %d): %s
                Phần trong [ ] là phần học viên được phép thay bằng từ khác hợp tình huống. Gợi ý: %s
                Học viên thực tế nói (nhận dạng giọng nói): %s
                Điểm phát âm (/100): chính xác %d, trôi chảy %d, đầy đủ %d.
                Điểm chính xác từng từ: %s

                Chọn verdict:
                - FOLLOWS_SCRIPT: nói đúng câu mẫu (có thể thay phần [ ] một cách hợp lý).
                - FITS_SITUATION: khác câu mẫu nhưng vẫn đúng ngữ pháp, lịch sự và hợp tình huống.
                - UNNATURAL: sai ngữ pháp, sai mức lịch sự, không hợp tình huống, thiếu ý hoặc không tự nhiên.

                comment: 1-2 câu tiếng Việt về điểm quan trọng nhất của câu này.
                - KHÔNG mở đầu bằng lời khen chung ("Em làm rất tốt", "Tuyệt vời"...) và KHÔNG khuyên chung chung ("hãy luyện tập thêm").
                - Nói thẳng vào nội dung: ngữ pháp, trợ từ, mức lịch sự, độ tự nhiên trong tình huống, hoặc cách dùng từ học viên tự thay.
                - Nếu trôi chảy dưới 70, nói rõ học viên ngắt quãng hoặc nói chậm ở đâu.

                suggestion: một câu tiếng Nhật đúng và tự nhiên hơn, giữ ý học viên muốn nói. Để chuỗi rỗng nếu câu đã đúng và tự nhiên.

                tips: 0-3 mục, mỗi mục cho một từ cụ thể có điểm chính xác dưới 80 hoặc dùng sai.
                - word: từ đó (viết như trong câu).
                - issue: vấn đề cụ thể bằng tiếng Việt, kèm cách đọc kana, ví dụ "ジュース (じゅーす): dễ đọc thiếu trường âm ー".
                - fix: cách sửa có thể làm ngay, ví dụ "kéo dài じゅ thành 2 nhịp: じゅ-ー-す", "ngắt 1 nhịp ở っ", "ん trước m/b/p đọc như m".
                Chỉ nêu lỗi phát âm thường gặp của người Việt khi điểm từ đó thấp (trường âm, âm ngắt っ, ん, つ/す, ざ/じゃ, ら行, cao độ); không bịa lỗi cho từ điểm cao.

                Ví dụ comment TỆ: "Em làm rất tốt, cố gắng luyện thêm từ ジュース nhé."
                Ví dụ comment TỐT: "Thay お水 bằng オレンジジュース là hợp tình huống; ～をください vẫn đúng và đủ lịch sự khi gọi món."
                """.formatted(describe(context), lineIndex, marked(line),
                line.hint() == null ? "không có" : line.hint(), turn.recognizedText(),
                Math.round(turn.accuracy()), Math.round(turn.fluency()), Math.round(turn.completeness()),
                wordScores.isEmpty() ? "không có" : wordScores);
        Map<String, Object> tip = Map.of("type", "OBJECT",
                "properties", Map.of(
                        "word", Map.of("type", "STRING"),
                        "issue", Map.of("type", "STRING"),
                        "fix", Map.of("type", "STRING")),
                "required", List.of("word", "issue", "fix"));
        Map<String, Object> schema = Map.of("type", "OBJECT",
                "properties", Map.of(
                        "verdict", Map.of("type", "STRING", "enum", List.copyOf(VERDICTS)),
                        "comment", Map.of("type", "STRING"),
                        "suggestion", Map.of("type", "STRING"),
                        "tips", Map.of("type", "ARRAY", "items", tip)),
                "required", List.of("verdict", "comment", "suggestion", "tips"));
        Reply<JsonNode> reply = generate(prompt, schema);
        if (reply == null) return null;
        String verdict = reply.value().path("verdict").asText();
        String comment = reply.value().path("comment").asText("").trim();
        if (!VERDICTS.contains(verdict) || comment.isEmpty()) return null;
        String suggestion = reply.value().path("suggestion").asText("").trim();
        // The model sometimes repeats the learner's own sentence as the "better" one; that is no suggestion.
        if (SpeakingService.normalize(suggestion).equals(SpeakingService.normalize(turn.recognizedText())))
            suggestion = "";
        List<Tip> tips = new ArrayList<>();
        for (JsonNode node : reply.value().path("tips")) {
            String word = node.path("word").asText("").trim();
            String issue = node.path("issue").asText("").trim();
            String fix = node.path("fix").asText("").trim();
            if (!word.isEmpty() && !issue.isEmpty() && tips.size() < 3) tips.add(new Tip(word, issue, fix));
        }
        return new Reply<>(new TurnFeedback(verdict, comment, suggestion.isEmpty() ? null : suggestion, tips),
                reply.inputTokens(), reply.outputTokens());
    }

    /** Writes a short overall review of a finished session. */
    public Reply<String> reviewSession(Context context, List<TurnResult> turns, double pronScore) {
        String spoken = turns.stream().map(t -> "- Dòng %d: \"%s\" (phát âm %d/100%s)".formatted(t.lineIndex(),
                t.recognizedText(), Math.round(t.pronScore()),
                t.feedback() == null ? "" : ", " + t.feedback().verdict())).collect(Collectors.joining("\n"));
        String prompt = """
                Bạn là giáo viên tiếng Nhật. Viết nhận xét tổng kết cho học viên người Việt sau một phiên luyện hội thoại nhập vai.
                %s
                Các câu học viên đã nói:
                %s
                Điểm phát âm trung bình: %d/100.

                Viết 2-3 câu tiếng Việt: điểm làm tốt, điểm cần cải thiện nhất (ngữ pháp, cách nói hoặc âm cụ thể), và một lời khuyên luyện tập.
                """.formatted(describe(context), spoken, Math.round(pronScore));
        Map<String, Object> schema = Map.of("type", "OBJECT",
                "properties", Map.of("feedback", Map.of("type", "STRING")),
                "required", List.of("feedback"));
        Reply<JsonNode> reply = generate(prompt, schema);
        if (reply == null) return null;
        String feedback = reply.value().path("feedback").asText("").trim();
        return feedback.isEmpty() ? null : new Reply<>(feedback, reply.inputTokens(), reply.outputTokens());
    }

    private String describe(Context context) {
        String script = IntStream.range(0, context.script().size()).mapToObj(i -> {
            ScriptLine line = context.script().get(i);
            String who = "AI".equals(line.speaker()) ? context.aiRole() : context.studentRole() + " (học viên)";
            return "%d. %s: %s — %s".formatted(i, who, marked(line), line.translation());
        }).collect(Collectors.joining("\n"));
        return """
                Tình huống: %s
                %s
                Vai AI: %s. Vai học viên: %s.
                Kịch bản mẫu:
                %s
                """.formatted(context.title(), context.situation(), context.aiRole(), context.studentRole(), script);
    }

    /** The line's text with replaceable parts wrapped in [ ]. */
    private static String marked(ScriptLine line) {
        return line.segments().stream()
                .map(s -> Boolean.TRUE.equals(s.free()) ? "[" + s.text() + "]" : s.text())
                .collect(Collectors.joining());
    }

    private Reply<JsonNode> generate(String prompt, Map<String, Object> schema) {
        if (apiKey.isBlank()) return null;
        try {
            boolean withThinking = sendThinkingConfig;
            var response = send(prompt, schema, withThinking);
            if (response.statusCode() == 400 && withThinking) {
                // Some models (e.g. Lite ones) reject thinkingConfig; retry once without it.
                log.info("Gemini model {} returned HTTP 400; retrying without thinkingConfig", model);
                response = send(prompt, schema, false);
                if (response.statusCode() == 200) sendThinkingConfig = false;
            } else if (response.statusCode() == 503 || response.statusCode() == 429) {
                // Overloaded or rate limited: these are usually short-lived, so wait briefly and retry once.
                log.info("Gemini model {} returned HTTP {}; retrying once", model, response.statusCode());
                Thread.sleep(1500);
                response = send(prompt, schema, withThinking);
            }
            if (response.statusCode() != 200) {
                log.warn("Gemini feedback failed: HTTP {} {}", response.statusCode(), response.body());
                return null;
            }
            JsonNode root = json.readTree(response.body());
            StringBuilder text = new StringBuilder();
            for (JsonNode part : root.path("candidates").path(0).path("content").path("parts"))
                text.append(part.path("text").asText(""));
            if (text.isEmpty()) return null;
            JsonNode usage = root.path("usageMetadata");
            return new Reply<>(json.readTree(text.toString()), usage.path("promptTokenCount").asInt(),
                    usage.path("candidatesTokenCount").asInt());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception e) {
            log.warn("Gemini feedback error", e);
            return null;
        }
    }

    private HttpResponse<String> send(String prompt, Map<String, Object> schema, boolean withThinking)
            throws Exception {
        var config = new java.util.LinkedHashMap<String, Object>();
        config.put("temperature", 0.3);
        config.put("responseMimeType", "application/json");
        config.put("responseSchema", schema);
        // Short feedback does not need reasoning; skipping it keeps each turn fast.
        if (withThinking) config.put("thinkingConfig", Map.of("thinkingBudget", 0));
        var body = Map.of(
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", config);
        var uri = URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                + URLEncoder.encode(model, StandardCharsets.UTF_8) + ":generateContent");
        var request = HttpRequest.newBuilder(uri)
                .timeout(timeout)
                .header("x-goog-api-key", apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}
