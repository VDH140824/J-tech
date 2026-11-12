package com.jtech.dto.response;

import java.util.List;

/** Response shapes of the AI speaking practice, mirrored by frontend/api/speakingApi.ts. */
public final class SpeakingResponses {
    private SpeakingResponses() {}

    /** A piece of one script line. {@code free} marks the part the learner may replace. */
    public record ScriptSegment(String text, Boolean free) {}

    /** One line of speaking_scenario.sample_script. {@code speaker} is AI or STUDENT. */
    public record ScriptLine(String speaker, List<ScriptSegment> segments, String translation, String hint) {
        public String text() {
            return segments == null ? "" : segments.stream().map(ScriptSegment::text).reduce("", String::concat);
        }

        /** The fixed (non-replaceable) text of the line, used to tell which spoken words were free. */
        public String fixedText() {
            return segments == null ? "" : segments.stream()
                    .filter(s -> !Boolean.TRUE.equals(s.free())).map(ScriptSegment::text).reduce("", String::concat);
        }
    }

    public record Scenario(long id, long chapterId, String title, String situation, String aiRole,
            String studentRole, List<ScriptLine> script, int completedCount) {}

    public record SessionStarted(long id) {}

    public record WordScore(String text, double accuracy, Boolean free) {}

    /** One concrete correction: what went wrong with {@code word} and how to fix it. */
    public record Tip(String word, String issue, String fix) {}

    /**
     * verdict is FOLLOWS_SCRIPT, FITS_SITUATION or UNNATURAL. suggestion is a better Japanese sentence,
     * or null when the learner's sentence is already right. Results saved before these two fields
     * existed read back with them null.
     */
    public record TurnFeedback(String verdict, String comment, String suggestion, List<Tip> tips) {}

    public record TurnResult(int lineIndex, String recognizedText, List<WordScore> words, double accuracy,
            double fluency, double completeness, double pronScore, TurnFeedback feedback) {}

    public record SessionResult(long id, long scenarioId, String scenarioTitle, int turnCount, double pronScore,
            double accuracy, double fluency, double completeness, String overallFeedback,
            List<WordScore> weakWords) {}
}
