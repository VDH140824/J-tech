package com.jtech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Asks Gemini to write a short Japanese reading passage with five multiple-choice questions from the
 * vocabulary, grammar and kanji of a course scope. Returns null (never throws) when Gemini is not configured
 * or does not answer; the caller validates the content of a non-null reply.
 */
@Component
public class ReadingGeneratorClient {
    private static final Logger log = LoggerFactory.getLogger(ReadingGeneratorClient.class);
    public static final int QUESTION_COUNT = 5;
    /** Shortest passage (characters after furigana is removed) the service accepts from Gemini. */
    public static final int MIN_PASSAGE_LENGTH = 250;

    /** One format is picked at random for each passage so learners get varied texts. */
    private static final List<String> FORMATS = List.of(
            "nhật ký kể lại một ngày của nhân vật",
            "thư hoặc email gửi bạn kể về cuộc sống gần đây",
            "bài giới thiệu bản thân, gia đình hoặc thành phố nơi nhân vật sống",
            "câu chuyện kể về một ngày cuối tuần hoặc một chuyến đi",
            "thông báo hoặc lời nhắn của trường, câu lạc bộ, cửa hàng kèm phần nhân vật dự định tham gia");

    /** Wait before the single retry of a busy model; after that the next model is tried instead. */
    private static final long RETRY_DELAY_MS = 2000;
    /** Longest one generate call may spend across every model, so a learner never waits minutes. */
    private static final Duration TOTAL_BUDGET = Duration.ofSeconds(45);
    /** A request is not started with less time than this left, since Gemini cannot answer that fast. */
    private static final Duration MIN_REQUEST_TIME = Duration.ofSeconds(5);

    /** Learning data the passage must be built from. */
    public record Source(String scopeLabel, List<String> vocabulary, List<String> grammar, List<String> kanji) {}

    public record Question(String content, Map<String, String> options, String correctAnswer, String explanation) {}

    public record Passage(String title, String passageJp, String translationVi, List<Question> questions) {}

    public record Reply(Passage passage, int inputTokens, int outputTokens) {}

    private final ObjectMapper json;
    private final String apiKey;
    /** Primary model followed by the fallbacks tried when it stays busy or does not exist. */
    private final List<String> models;
    private final Duration timeout;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    /** Models found to reject thinkingConfig; requests to them are sent without it. */
    private final Set<String> rejectsThinkingConfig = ConcurrentHashMap.newKeySet();

    public ReadingGeneratorClient(ObjectMapper json,
            @Value("${app.speaking.gemini.api-key:}") String apiKey,
            @Value("${app.reading.gemini.model:gemini-3.8-flash}") String model,
            @Value("${app.reading.gemini.fallback-models:${READING_GEMINI_FALLBACK_MODELS:gemini-flash-latest}}")
            String fallbackModels,
            @Value("${app.reading.gemini.timeout-seconds:60}") long timeoutSeconds) {
        this.json = json;
        this.apiKey = apiKey == null ? "" : apiKey;
        this.models = modelOrder(model, fallbackModels);
        this.timeout = Duration.ofSeconds(timeoutSeconds);
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public Reply generate(Source source) {
        if (!isConfigured()) return null;
        String prompt = """
                Bạn là giáo viên tiếng Nhật cho người Việt mới học (trình độ N5–N4). Hãy viết một bài đọc hiểu.
                Phạm vi: %s
                Từ vựng nên dùng: %s
                Ngữ pháp nên dùng: %s
                Chữ Hán đã học: %s
                Dạng bài: %s

                Yêu cầu:
                - passageJp: bài văn tiếng Nhật thể です/ます theo đúng dạng bài ở trên, dài ÍT NHẤT 400 ký tự và nên
                  khoảng 450–550 ký tự (không tính phần cách đọc furigana; bài dưới 400 ký tự là sai yêu cầu, hãy viết
                  thêm chi tiết cho đến khi đủ độ dài), chia 3 đoạn bằng ký tự xuống dòng \\n, theo bố cục:
                  1) Mở đầu: giới thiệu nhân vật (có tên riêng), thời gian, địa điểm.
                  2) Diễn biến: 3–4 việc xảy ra theo thứ tự thời gian, mỗi việc có chi tiết cụ thể (giờ, nơi chốn,
                     người đi cùng, lý do, cảm nhận) để làm câu hỏi.
                  3) Kết thúc: cảm nghĩ của nhân vật hoặc dự định tiếp theo.
                  Chỉ dùng từ vựng, ngữ pháp ở trên hoặc dễ hơn. Viết như sách giáo khoa tiếng Nhật thông thường:
                  dùng chữ Hán cho các từ thường viết bằng chữ Hán ở trình độ N5–N4 (ưu tiên chữ Hán đã học ở trên,
                  ví dụ 私, 学生, 日本, 行きます, 食べます, 今日, 先生), không viết toàn bộ bằng hiragana; trợ từ, đuôi động từ
                  và từ thường viết bằng kana thì giữ kana. Không đánh số câu.
                - Furigana: MỌI từ có chữ Hán (trong title, passageJp, content và options) phải ghi cách đọc theo dạng
                  {chữ Hán|cách đọc hiragana}, chỉ bọc phần chữ Hán, phần okurigana để ngoài. Ví dụ: {私|わたし}は{学生|がくせい}です。
                  {行|い}きます。{日本語|にほんご}を{勉強|べんきょう}します。Chỉ bọc chữ Hán: KHÔNG bao giờ bọc hiragana,
                  katakana, số hay chữ Latin (viết ベトナム, không viết {ベトナム}). Không dùng dấu ngoặc nhọn { } cho mục đích khác.
                - title: tiêu đề tiếng Nhật ngắn của bài.
                - translationVi: bản dịch tiếng Việt tự nhiên của cả đoạn (không có furigana).
                - questions: đúng %d câu hỏi trắc nghiệm kiểm tra việc hiểu nội dung đoạn văn (không hỏi kiến thức ngoài bài),
                  trải đều cả mở đầu, diễn biến và kết thúc; có ít nhất 1 câu hỏi về lý do hoặc cảm nghĩ.
                  content viết bằng tiếng Nhật đơn giản (ví dụ: {田中|たなか}さんは どこへ {行|い}きましたか。);
                  options có đúng 4 lựa chọn A, B, C, D viết bằng tiếng Nhật, ngắn, không trùng nhau;
                  chỉ một lựa chọn đúng (correctAnswer là A, B, C hoặc D) và vị trí đáp án đúng nên thay đổi giữa các câu;
                  explanation: 1 câu tiếng Việt chỉ ra câu nào trong đoạn văn cho biết đáp án (trích tiếng Nhật trong 「」, không có furigana).
                """.formatted(source.scopeLabel(), join(source.vocabulary()), join(source.grammar()),
                join(source.kanji()), FORMATS.get(ThreadLocalRandom.current().nextInt(FORMATS.size())),
                QUESTION_COUNT);
        Map<String, Object> options = Map.of("type", "OBJECT",
                "properties", Map.of(
                        "A", Map.of("type", "STRING"), "B", Map.of("type", "STRING"),
                        "C", Map.of("type", "STRING"), "D", Map.of("type", "STRING")),
                "required", List.of("A", "B", "C", "D"),
                "propertyOrdering", List.of("A", "B", "C", "D"));
        Map<String, Object> question = Map.of("type", "OBJECT",
                "properties", Map.of(
                        "content", Map.of("type", "STRING"),
                        "options", options,
                        "correctAnswer", Map.of("type", "STRING", "enum", List.of("A", "B", "C", "D")),
                        "explanation", Map.of("type", "STRING")),
                "required", List.of("content", "options", "correctAnswer", "explanation"),
                "propertyOrdering", List.of("content", "options", "correctAnswer", "explanation"));
        Map<String, Object> schema = Map.of("type", "OBJECT",
                "properties", Map.of(
                        "title", Map.of("type", "STRING"),
                        "passageJp", Map.of("type", "STRING"),
                        "translationVi", Map.of("type", "STRING"),
                        "questions", Map.of("type", "ARRAY", "items", question)),
                "required", List.of("title", "passageJp", "translationVi", "questions"),
                "propertyOrdering", List.of("title", "passageJp", "translationVi", "questions"));
        long deadline = System.nanoTime() + TOTAL_BUDGET.toNanos();
        for (String model : models) {
            if (remaining(deadline).compareTo(MIN_REQUEST_TIME) < 0) {
                log.warn("Gemini reading generation stopped before model {}: time budget of {} s used up", model,
                        TOTAL_BUDGET.toSeconds());
                break;
            }
            try {
                var response = request(model, prompt, schema, deadline);
                if (response.statusCode() == 200) {
                    var reply = read(response);
                    if (reply != null) return reply;
                    log.warn("Gemini model {} returned no text", model);
                } else {
                    log.warn("Gemini model {} failed: HTTP {} {}", model, response.statusCode(), response.body());
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            } catch (Exception e) {
                // A timeout or unreadable answer from one model must not stop the fallbacks from being tried.
                log.warn("Gemini model {} reading generation error: {}", model, e.toString());
            }
        }
        return null;
    }

    /**
     * One model: drops thinkingConfig if the model rejects it, then retries once when it is busy. Each send is
     * limited to the time left before the deadline, and a resend is skipped when too little time is left.
     */
    private HttpResponse<String> request(String model, String prompt, Map<String, Object> schema, long deadline)
            throws Exception {
        boolean withThinking = !rejectsThinkingConfig.contains(model);
        var response = send(model, prompt, schema, withThinking, deadline);
        if (response.statusCode() == 400 && withThinking && hasTimeFor(deadline, 0)) {
            log.info("Gemini model {} returned HTTP 400; retrying without thinkingConfig", model);
            withThinking = false;
            response = send(model, prompt, schema, false, deadline);
            // Any answer other than another 400 shows the model rejects thinkingConfig, even an overload error.
            if (response.statusCode() != 400) rejectsThinkingConfig.add(model);
        }
        if (isTransient(response.statusCode()) && hasTimeFor(deadline, RETRY_DELAY_MS)) {
            log.info("Gemini model {} returned HTTP {}; retrying in {} ms", model, response.statusCode(),
                    RETRY_DELAY_MS);
            Thread.sleep(RETRY_DELAY_MS);
            response = send(model, prompt, schema, withThinking, deadline);
        }
        return response;
    }

    private static Duration remaining(long deadline) {
        return Duration.ofNanos(Math.max(0, deadline - System.nanoTime()));
    }

    /** True when a request can still get MIN_REQUEST_TIME after waiting delayMs. */
    private static boolean hasTimeFor(long deadline, long delayMs) {
        return remaining(deadline).minusMillis(delayMs).compareTo(MIN_REQUEST_TIME) >= 0;
    }

    private Reply read(HttpResponse<String> response) throws Exception {
        JsonNode root = json.readTree(response.body());
        StringBuilder text = new StringBuilder();
        for (JsonNode part : root.path("candidates").path(0).path("content").path("parts"))
            text.append(part.path("text").asText(""));
        if (text.isEmpty()) return null;
        JsonNode usage = root.path("usageMetadata");
        return new Reply(parse(json.readTree(text.toString())), usage.path("promptTokenCount").asInt(),
                usage.path("candidatesTokenCount").asInt());
    }

    /** Primary model first, then each distinct fallback from a comma-separated list. */
    static List<String> modelOrder(String primary, String fallbacks) {
        var order = new LinkedHashSet<String>();
        if (primary != null && !primary.isBlank()) order.add(primary.trim());
        if (fallbacks != null)
            for (String name : fallbacks.split(","))
                if (!name.isBlank()) order.add(name.trim());
        return List.copyOf(order);
    }

    private static Passage parse(JsonNode node) {
        List<Question> questions = new ArrayList<>();
        for (JsonNode q : node.path("questions")) {
            Map<String, String> options = new LinkedHashMap<>();
            q.path("options").fields().forEachRemaining(e -> options.put(e.getKey(), e.getValue().asText("")));
            questions.add(new Question(q.path("content").asText("").trim(), options,
                    q.path("correctAnswer").asText("").trim(), q.path("explanation").asText("").trim()));
        }
        return new Passage(node.path("title").asText("").trim(), node.path("passageJp").asText("").trim(),
                node.path("translationVi").asText("").trim(), questions);
    }

    /** Overload, rate-limit and server errors that may succeed when the same request is sent again. */
    static boolean isTransient(int status) {
        return status == 429 || status == 500 || status == 503;
    }

    private static String join(List<String> items) {
        return items == null || items.isEmpty() ? "không có" : String.join("; ", items);
    }

    private HttpResponse<String> send(String model, String prompt, Map<String, Object> schema, boolean withThinking,
            long deadline) throws Exception {
        Duration left = remaining(deadline);
        Duration requestTimeout = left.compareTo(timeout) < 0 ? left : timeout;
        var config = new LinkedHashMap<String, Object>();
        config.put("temperature", 0.9);
        config.put("responseMimeType", "application/json");
        config.put("responseSchema", schema);
        if (withThinking) config.put("thinkingConfig", Map.of("thinkingBudget", 0));
        var body = Map.of(
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", config);
        var uri = URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                + URLEncoder.encode(model, StandardCharsets.UTF_8) + ":generateContent");
        var request = HttpRequest.newBuilder(uri)
                .timeout(requestTimeout)
                .header("x-goog-api-key", apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}
