package com.jtech.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Đọc answer_data của câu trắc nghiệm: {"options":{"A":..,"D":..},"correctAnswer":"A"}.
 * options dạng mảng được gán chữ A, B, C, D theo thứ tự.
 */
final class McqAnswerData {
    static final String[] LETTERS = {"A", "B", "C", "D"};

    record Data(Map<String, String> options, String correctAnswer) {}

    private McqAnswerData() {}

    /** null nếu answer_data không đọc được hoặc đáp án đúng không nằm trong các lựa chọn. */
    static Data read(String raw, ObjectMapper json) {
        if (raw == null || raw.isBlank()) return null;
        try {
            JsonNode root = json.readTree(raw);
            Map<String, String> options = new LinkedHashMap<>();
            JsonNode node = root.path("options");
            if (node.isArray()) {
                for (int i = 0; i < node.size() && i < LETTERS.length; i++) options.put(LETTERS[i], node.get(i).asText());
            } else if (node.isObject()) {
                for (String letter : LETTERS) {
                    if (node.hasNonNull(letter)) options.put(letter, node.get(letter).asText());
                }
            }
            String correct = letter(root.path("correctAnswer").asText(null));
            if (options.size() < 2 || correct == null || !options.containsKey(correct)) return null;
            return new Data(options, correct);
        } catch (Exception ex) {
            return null;
        }
    }

    /** "a" / " B " → "A" / "B"; giá trị khác A–D → null. */
    static String letter(String value) {
        if (value == null) return null;
        String upper = value.trim().toUpperCase(Locale.ROOT);
        for (String letter : LETTERS) if (letter.equals(upper)) return letter;
        return null;
    }
}
