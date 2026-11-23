package com.jtech.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class AiReadingServiceValidationTest {

    private static final Map<String, String> OPTIONS = Map.of("A", "{駅|えき}", "B", "{学校|がっこう}", "C", "うち", "D", "みせ");
    /** 14 characters without furigana; repeated to reach the minimum passage length. */
    private static final String SENTENCE = "{私|わたし}は{学生|がくせい}です。{毎日|まいにち}{行|い}きます。";

    private static String longPassage() {
        return SENTENCE.repeat(ReadingGeneratorClient.MIN_PASSAGE_LENGTH / 13 + 1);
    }

    private static ReadingGeneratorClient.Passage passage(String passageJp, String questionContent) {
        var question = new ReadingGeneratorClient.Question(questionContent, OPTIONS, "B", "Giải thích");
        return new ReadingGeneratorClient.Passage("{私|わたし}の{町|まち}", passageJp, "Bản dịch",
            Collections.nCopies(ReadingGeneratorClient.QUESTION_COUNT, question));
    }

    @Test
    void stripFuriganaKeepsKanjiAndDropsReadings() {
        assertEquals("私は学生です。", AiReadingService.stripFurigana("{私|わたし}は{学生|がくせい}です。"));
        assertEquals("行きます", AiReadingService.stripFurigana("{行|い}きます"));
        assertEquals("ひらがな", AiReadingService.stripFurigana("ひらがな"));
        assertNull(AiReadingService.stripFurigana(null));
    }

    @Test
    void stripFuriganaRemovesBracesWrappedAroundKana() {
        assertEquals("ベトナムの大学", AiReadingService.stripFurigana("{ベトナム}の{大学|だいがく}"));
    }

    @Test
    void longPassageWithFuriganaMarkupIsValid() {
        assertTrue(AiReadingService.isValid(passage(longPassage(), "{誰|だれ}ですか。")));
    }

    @Test
    void passageShorterThanMinimumIsInvalid() {
        // The markup is long, but only the visible text counts toward the length.
        assertFalse(AiReadingService.isValid(passage(SENTENCE.repeat(3), "{誰|だれ}ですか。")));
    }

    @Test
    void markupWithBlankKanjiCountsAsBlank() {
        assertFalse(AiReadingService.isValid(passage("{ |x}", "{誰|だれ}ですか。")));
        assertFalse(AiReadingService.isValid(passage(longPassage(), "{ |だれ}")));
    }

    @Test
    void onlyOverloadAndServerErrorsAreRetried() {
        assertTrue(ReadingGeneratorClient.isTransient(503));
        assertTrue(ReadingGeneratorClient.isTransient(429));
        assertTrue(ReadingGeneratorClient.isTransient(500));
        assertFalse(ReadingGeneratorClient.isTransient(200));
        assertFalse(ReadingGeneratorClient.isTransient(400));
        assertFalse(ReadingGeneratorClient.isTransient(403));
    }

    @Test
    void primaryModelIsTriedBeforeDistinctFallbacks() {
        assertEquals(List.of("lite", "flash", "pro"),
            ReadingGeneratorClient.modelOrder("lite", " flash, ,lite,pro "));
        assertEquals(List.of("lite"), ReadingGeneratorClient.modelOrder("lite", ""));
        assertEquals(List.of("flash"), ReadingGeneratorClient.modelOrder(" ", "flash"));
    }

    @Test
    void reusedPassageKeepsTextButDropsPreviousAnswers() throws Exception {
        var stored = new ObjectMapper().readTree("""
            {"title":"{町|まち}","passageJp":"本文","translationVi":"Bản dịch","answers":{"0":"A"}}
            """);
        assertEquals(Map.of("title", "{町|まち}", "passageJp", "本文", "translationVi", "Bản dịch"),
            AiReadingService.reusablePassageData(stored));
    }

    @Test
    void wrongQuestionCountIsInvalid() {
        var p = passage(longPassage(), "{誰|だれ}ですか。");
        assertFalse(AiReadingService.isValid(new ReadingGeneratorClient.Passage(
            p.title(), p.passageJp(), p.translationVi(), List.of(p.questions().get(0)))));
    }
}
