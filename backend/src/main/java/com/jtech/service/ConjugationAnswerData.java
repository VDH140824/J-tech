package com.jtech.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jtech.entity.ConjugationForm;
import com.jtech.entity.Question;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public final class ConjugationAnswerData {
    private ConjugationAnswerData() {}

    public record Data(String verb, String reading, String meaningVi, int verbGroup,
        String correctAnswer, List<String> acceptedAnswers, List<String> options) {}

    public static String write(ObjectMapper json, String verb, String reading, String meaningVi, int verbGroup,
            String correctAnswer, List<String> acceptedAnswers, List<String> options) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("verb", verb);
        if (reading != null && !reading.isBlank()) data.put("reading", reading);
        if (meaningVi != null && !meaningVi.isBlank()) data.put("meaningVi", meaningVi);
        data.put("verbGroup", verbGroup);
        data.put("correctAnswer", correctAnswer);
        data.put("acceptedAnswers", acceptedAnswers == null ? List.of() : acceptedAnswers);
        data.put("options", options == null ? List.of() : options);
        try {
            return json.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String buildContent(ConjugationForm form, String verb, String reading) {
        String formName = form.getNameVi() == null ? "" : form.getNameVi().trim();
        if (!formName.isEmpty()) formName = Character.toLowerCase(formName.charAt(0)) + formName.substring(1);
        String verbPart = reading == null || reading.isBlank() ? verb : verb + " (" + reading.trim() + ")";
        return "Chia động từ " + verbPart + " sang " + formName + ".";
    }

    public static String normalize(String value) {
        if (value == null) return "";
        String text = Normalizer.normalize(value, Normalizer.Form.NFKC).replaceAll("\\s+", "");
        StringBuilder out = new StringBuilder(text.length());
        for (char c : text.toCharArray()) out.append(c >= '\u30A1' && c <= '\u30F6' ? (char) (c - 0x60) : c);
        return out.toString();
    }

   
    public static Data read(Question q, ObjectMapper json) {
        try {
            JsonNode root = q.getAnswerData() == null ? json.createObjectNode() : json.readTree(q.getAnswerData());
            if (root == null || !root.isObject()) root = json.createObjectNode();

            Map<String, String> optionByKey = new LinkedHashMap<>();
            List<String> options = new ArrayList<>();
            JsonNode optionNode = root.path("options");
            if (optionNode.isObject()) {
                optionNode.fields().forEachRemaining(e -> {
                    String text = e.getValue().asText("").trim();
                    if (!text.isEmpty()) {
                        optionByKey.put(e.getKey().trim().toUpperCase(Locale.ROOT), text);
                        options.add(text);
                    }
                });
            } else {
                options.addAll(strings(optionNode));
            }

            List<String> accepted = new ArrayList<>();
            for (String field : List.of("correctAnswers", "correct_answers", "acceptedAnswers", "accepted_answers", "answers", "alternatives")) {
                accepted.addAll(strings(root.path(field)));
            }
            String correct = text(root, "correctAnswer", "correct_answer", "answer", "correct", "expectedAnswer", "expected_answer");
            if (correct.isEmpty() && !accepted.isEmpty()) correct = accepted.get(0);
            String mapped = optionByKey.get(correct.toUpperCase(Locale.ROOT));
            if (mapped != null) correct = mapped; // dạng trắc nghiệm: correctAnswer = "A"
            if (correct.isEmpty()) return null; // không xác định được đáp án → bỏ qua câu
            final String answer = correct;
            List<String> others = accepted.stream()
                .map(v -> optionByKey.getOrDefault(v.toUpperCase(Locale.ROOT), v))
                .filter(v -> !normalize(v).equals(normalize(answer)))
                .distinct()
                .toList();

            String verb = text(root, "verb", "dictionaryForm", "dictionary_form", "baseForm", "base_form", "word");
            String reading = text(root, "reading", "kana", "furigana");
            if (verb.isEmpty() && q.getContent() != null) {
                Matcher m = VERB_IN_CONTENT.matcher(q.getContent());
                if (m.find()) {
                    verb = m.group(1);
                    if (reading.isEmpty() && m.group(2) != null) reading = m.group(2);
                }
            }
            int group = verbGroup(root.has("verbGroup") ? root.path("verbGroup")
                : root.has("verb_group") ? root.path("verb_group") : root.path("group"));
            if (group == 0) group = inferVerbGroup(verb, reading);
            return new Data(verb, reading, text(root, "meaningVi", "meaning", "meaning_vi"), group, correct,
                others, options);
        } catch (Exception ex) {
            return null;
        }
    }

    private static final Pattern VERB_IN_CONTENT =
        Pattern.compile("động từ\\s+([^\\s（(]+)\\s*(?:[（(]\\s*([^）)]+?)\\s*[）)])?", Pattern.CASE_INSENSITIVE);

    private static final String I_ROW = "いきぎしじちぢにひびぴみり";
    private static final String E_ROW = "えけげせぜてでねへべぺめれ";
    private static final Set<String> GROUP1_EXCEPTIONS = Set.of("帰る", "入る", "走る", "要る", "切る", "知る", "減る",
        "喋る", "滑る", "蹴る", "焦る", "限る", "握る", "参る", "混じる", "茂る", "覆る", "照る", "散る", "湿る");

    public static int inferVerbGroup(String verb, String reading) {
        String v = verb == null ? "" : verb.trim();
        String r = normalize(reading == null || reading.isBlank() ? v : reading);
        if (v.endsWith("する") || r.endsWith("する") || v.endsWith("来る") || r.equals("くる")) return 3;
        if (GROUP1_EXCEPTIONS.contains(v)) return 1;
        if (r.endsWith("る") && r.length() >= 2) {
            char before = r.charAt(r.length() - 2);
            return I_ROW.indexOf(before) >= 0 || E_ROW.indexOf(before) >= 0 ? 2 : 1;
        }
        return r.isEmpty() ? 0 : ("うくぐすつぬぶむ".indexOf(r.charAt(r.length() - 1)) >= 0 ? 1 : 0);
    }

    private static String text(JsonNode root, String... fields) {
        for (String field : fields) {
            JsonNode node = root.path(field);
            if (node.isValueNode()) {
                String value = node.asText("").trim();
                if (!value.isEmpty()) return value;
            }
        }
        return "";
    }

    private static int verbGroup(JsonNode node) {
        String text = node.asText("").trim().toUpperCase(Locale.ROOT).replace("GROUP", "").replace("_", "").trim();
        return switch (text) {
            case "1", "I" -> 1;
            case "2", "II" -> 2;
            case "3", "III" -> 3;
            default -> 0;
        };
    }

    private static List<String> strings(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node.isArray()) node.forEach(n -> {
            String v = n.asText("").trim();
            if (!v.isEmpty()) values.add(v);
        });
        return values;
    }
}
