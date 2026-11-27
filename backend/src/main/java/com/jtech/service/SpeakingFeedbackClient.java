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
    /** Verdict for rude or abusive speech; such a turn is rejected instead of scored. */
    public static final String INAPPROPRIATE = "INAPPROPRIATE";
    /** Verdict for curt or provocative but not abusive speech; the turn is kept and the learner must say it again. */
    public static final String IMPOLITE = "IMPOLITE";
    /** Verdict for a reply that does not answer the line before it; the learner must answer again. */
    public static final String OFF_TOPIC = "OFF_TOPIC";
    private static final Set<String> VERDICTS =
            Set.of("FOLLOWS_SCRIPT", "FITS_SITUATION", "UNNATURAL", OFF_TOPIC, IMPOLITE, INAPPROPRIATE);

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
                Câu người đối thoại vừa nói ngay trước lượt này: %s
                Câu học viên cần nói (dòng %d): %s
                Phần trong [ ] là phần học viên được phép thay bằng từ khác hợp tình huống. Gợi ý: %s
                Học viên thực tế nói (nhận dạng giọng nói): %s
                Lưu ý: đây là bản chép tự động, số đếm có thể bị viết thành chữ số (ふたり → 2人). Không được suy ra học viên đọc sai chỉ vì chữ số hay chữ Hán có nhiều cách đọc; chỉ nêu lỗi đọc khi điểm từ đó thấp.
                Điểm phát âm (/100): chính xác %d, trôi chảy %d, đầy đủ %d.
                Điểm chính xác từng từ: %s

                Trước khi chọn verdict, tự hỏi: câu học viên có đáp đúng ý câu người đối thoại vừa nói (trả lời đúng câu hỏi, đáp lại đúng lời mời/yêu cầu) và mang cùng mục đích với câu mẫu không? Câu đúng ngữ pháp, lịch sự nhưng trả lời lạc đề (ví dụ được hỏi "mấy người" mà lại hỏi "làm gì") vẫn là KHÔNG hợp tình huống mà là OFF_TOPIC.

                verdict chỉ chấm NỘI DUNG (đáp đúng ý, ngữ pháp, từ vựng, mức lịch sự), không chấm phát âm: điểm phát âm thấp không làm câu thành UNNATURAL, điểm cao không làm câu thành FOLLOWS_SCRIPT/FITS_SITUATION. Phát âm chỉ nêu trong comment và tips.
                Từ đệm (えっと, あの, その), ngập ngừng hoặc tự sửa trong câu không phải lỗi nội dung: chấm theo câu học viên chốt lại cuối cùng. Câu ngắn mà đủ ý trong tình huống (ví dụ 二人です) không bị coi là thiếu ý.

                Chọn verdict:
                - FOLLOWS_SCRIPT: nói đúng câu mẫu (có thể thay phần [ ] một cách hợp lý).
                - FITS_SITUATION: khác câu mẫu nhưng đáp đúng ý câu người đối thoại vừa nói, cùng mục đích với câu mẫu, đúng ngữ pháp và lịch sự. Kể cả khi học viên chọn thứ ngoài các lựa chọn được hỏi nhưng vẫn hợp lý (được hỏi cà phê hay trà mà xin nước).
                - UNNATURAL: đáp đúng ý câu người đối thoại vừa nói nhưng sai ngữ pháp, kính ngữ chưa chuẩn, thiếu ý hoặc không tự nhiên, thái độ vẫn bình thường.
                - OFF_TOPIC: không đáp đúng ý câu người đối thoại vừa nói (trả lời sang chuyện khác, hỏi ngược điều không liên quan, nói câu không dính tới tình huống), dù ngữ pháp và mức lịch sự đều đúng. Khi chọn mức này, comment nói rõ người đối thoại vừa hỏi/nói gì và câu học viên lệch ở đâu; suggestion BẮT BUỘC là một câu trả lời đúng ý, ngắn gọn.
                - IMPOLITE: không có từ chửi nhưng thái độ thiếu lịch sự rõ rệt với người nghe: cộc lốc, khiêu khích, mỉa mai, ra lệnh, trách móc hoặc dùng thể thường suồng sã với người lạ/khách (ví dụ 見えないか, 早くしろ, 水, 何だよ). Khi chọn mức này, comment nói rõ vì sao câu thiếu lịch sự và suggestion BẮT BUỘC là câu lịch sự thay thế.
                - INAPPROPRIATE: câu có từ chửi bới, thô tục, xúc phạm hoặc giọng gắt gỏng, thù địch với người nghe (ví dụ ばかやろう, てめえ, うるさい, 何見てんだ, đuôi 〜やろう/〜野郎 dùng để mắng). Câu nói được nhận dạng giọng nói chép lại nên từ chửi có thể bị nghe nhầm thành từ phát âm gần giống (ばかやろう → 真っ赤やろう): chỉ chọn INAPPROPRIATE khi câu vừa lạc đề VỪA có cách đọc gần một từ chửi đã biết (ばか, あほ, くそ, てめえ, đuôi やろう...). Câu chỉ lạc đề mà không nghe giống từ chửi thì là OFF_TOPIC. Không chọn nếu từ đó vốn nằm trong câu mẫu, hoặc học viên chỉ nhắc/trích từ đó (ví dụ hỏi nghĩa) chứ không dùng để mắng người nghe.

                Câu mắc nhiều lỗi thì chọn mức nặng nhất theo thứ tự: INAPPROPRIATE > IMPOLITE > OFF_TOPIC > UNNATURAL.

                comment: 1-2 câu tiếng Việt về điểm quan trọng nhất của câu này.
                - KHÔNG mở đầu bằng lời khen chung ("Em làm rất tốt", "Tuyệt vời"...) và KHÔNG khuyên chung chung ("hãy luyện tập thêm").
                - Nói thẳng vào nội dung: ngữ pháp, trợ từ, mức lịch sự, độ tự nhiên trong tình huống, hoặc cách dùng từ học viên tự thay.
                - Nếu trôi chảy dưới 70, nói rõ học viên ngắt quãng hoặc nói chậm ở đâu.

                suggestion: một câu tiếng Nhật đúng và tự nhiên hơn, giữ ý học viên muốn nói. Để chuỗi rỗng nếu câu đã đúng và tự nhiên.

                tips: 0-3 mục, mỗi mục cho một từ cụ thể có điểm chính xác dưới 80 hoặc dùng sai.
                - word: từ đó (viết như trong câu).
                - issue: vấn đề cụ thể bằng tiếng Việt, kèm cách đọc kana, ví dụ "ジュース (じゅーす): dễ đọc thiếu trường âm ー".
                - fix: cách sửa có thể làm ngay, ví dụ "kéo dài じゅ thành 2 nhịp: じゅ-ー-す", "ngắt 1 nhịp ở っ", "ん trước m/b/p đọc như m".
                Chỉ nêu lỗi phát âm thường gặp của người Việt khi điểm từ đó thấp (trường âm, âm ngắt っ, ん, つ/す, ざ/じゃ, ら行); không bịa lỗi cho từ điểm cao. Không nhận xét cao độ/ngữ điệu vì không có dữ liệu đo. Không cố tạo đủ 3 mục: không xác định được lỗi cụ thể thì bỏ qua từ đó.

                Ví dụ comment TỆ: "Em làm rất tốt, cố gắng luyện thêm từ ジュース nhé."
                Ví dụ comment TỐT: "Thay お水 bằng オレンジジュース là hợp tình huống; ～をください vẫn đúng và đủ lịch sự khi gọi món."

                verdict phải khớp với comment và suggestion: nếu comment nói câu sai, lạc đề hoặc không phù hợp, hoặc suggestion đổi hẳn ý câu học viên, thì KHÔNG được chọn FOLLOWS_SCRIPT hay FITS_SITUATION; nếu comment nói câu lạc đề thì verdict là OFF_TOPIC.
                """.formatted(describe(context), previousLine(context, lineIndex), lineIndex, marked(line),
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
                "required", List.of("verdict", "comment", "suggestion", "tips"),
                // The verdict comes last so the model settles it after writing its review, not before.
                "propertyOrdering", List.of("comment", "suggestion", "tips", "verdict"));
        Reply<JsonNode> reply = generate(prompt, schema);
        if (reply == null) return null;
        String verdict = reply.value().path("verdict").asText();
        String comment = reply.value().path("comment").asText("").trim();
        if (!VERDICTS.contains(verdict) || comment.isEmpty()) return null;
        String suggestion = reply.value().path("suggestion").asText("").trim();
        // The model sometimes repeats the learner's own sentence as the "better" one; that is no suggestion.
        if (SpeakingService.normalize(suggestion).equals(SpeakingService.normalize(turn.recognizedText())))
            suggestion = "";
        // A tip must point at a word the learner actually said and say how to fix it; anything else is noise.
        String said = SpeakingService.normalize(turn.recognizedText());
        List<Tip> tips = new ArrayList<>();
        for (JsonNode node : reply.value().path("tips")) {
            String word = node.path("word").asText("").trim();
            String issue = node.path("issue").asText("").trim();
            String fix = node.path("fix").asText("").trim();
            boolean spoken = !word.isEmpty() && said.contains(SpeakingService.normalize(word));
            if (spoken && !issue.isEmpty() && !fix.isEmpty() && tips.size() < 3) tips.add(new Tip(word, issue, fix));
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

                Viết bằng tiếng Việt đúng 3 dòng, mỗi dòng một câu ngắn và bắt đầu bằng ký hiệu sau:
                ✓ điểm làm tốt
                △ điểm cần cải thiện nhất (ngữ pháp, cách nói hoặc âm cụ thể)
                💡 một lời khuyên luyện tập
                Khi trích tiếng Nhật, đặt trong 「」.
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

    /** The other speaker's line the learner is answering, so the review can judge whether the reply fits it. */
    static String previousLine(Context context, int lineIndex) {
        for (int i = lineIndex - 1; i >= 0; i--) {
            ScriptLine line = context.script().get(i);
            if ("AI".equals(line.speaker())) return marked(line).replace("[", "").replace("]", "");
        }
        return "không có (học viên mở đầu hội thoại)";
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
