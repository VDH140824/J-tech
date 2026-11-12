import { apiClient } from "../services/api";

/**
 * AI speaking practice.
 *
 * The backend endpoints below do not exist yet: this file is the contract the
 * frontend is built against. Setting VITE_SPEAKING_DEMO=true swaps every call
 * for the sample dialogue in pages/speaking/speakingDemoData.ts so the screens
 * can be viewed before the backend is ready.
 */
export const SPEAKING_DEMO = import.meta.env.VITE_SPEAKING_DEMO === "true";

const loadDemo = () => import("../pages/speaking/speakingDemoData");

export type SpeakingSpeaker = "AI" | "STUDENT";

/** A piece of one script line. `free` marks the yellow part the learner may replace. */
export interface SpeakingScriptSegment {
  text: string;
  free?: boolean;
}

export interface SpeakingScriptLine {
  speaker: SpeakingSpeaker;
  segments: SpeakingScriptSegment[];
  translation: string;
  /** Replacement ideas for the free parts of a learner line. */
  hint?: string;
}

export interface SpeakingScenario {
  id: number;
  chapterId: number;
  title: string;
  situation: string;
  aiRole: string;
  studentRole: string;
  /** The full textbook dialogue (speaking_scenario.sample_script). */
  script: SpeakingScriptLine[];
  /** How many sessions the current learner has completed for this scenario. */
  completedCount: number;
}

export interface SpeakingWordScore {
  text: string;
  accuracy: number;
  /** True when the word was spoken inside a free (yellow) part. */
  free?: boolean;
}

export type SpeakingVerdict = "FOLLOWS_SCRIPT" | "FITS_SITUATION" | "UNNATURAL";

/** One concrete correction for a word the learner said. */
export interface SpeakingTip {
  word: string;
  issue: string;
  fix: string;
}

/** The language model's review of one learner sentence. */
export interface SpeakingTurnFeedback {
  verdict: SpeakingVerdict;
  comment: string;
  /** A better Japanese sentence; null when the learner's sentence is already right. Missing on older results. */
  suggestion?: string | null;
  /** Missing on older results. */
  tips?: SpeakingTip[] | null;
}

export interface SpeakingTurnResult {
  lineIndex: number;
  recognizedText: string;
  words: SpeakingWordScore[];
  accuracy: number;
  fluency: number;
  completeness: number;
  pronScore: number;
  /** Null while the language model is not connected or could not answer. */
  feedback: SpeakingTurnFeedback | null;
}

export interface SpeakingSessionResult {
  id: number;
  scenarioId: number;
  scenarioTitle: string;
  turnCount: number;
  pronScore: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  overallFeedback: string | null;
  /** Words worth practising again, weakest first. */
  weakWords: SpeakingWordScore[];
}

export async function getSpeakingScenarios(chapterId: number): Promise<SpeakingScenario[]> {
  if (SPEAKING_DEMO) return (await loadDemo()).demoScenarios(chapterId);
  return (
    await apiClient.get<SpeakingScenario[]>(`/student/chapters/${chapterId}/speaking-scenarios`)
  ).data;
}

/** `swapped` lets the learner play the AI role; the server keeps that choice for the whole session. */
export async function startSpeakingSession(
  scenarioId: number,
  swapped = false,
): Promise<{ id: number }> {
  if (SPEAKING_DEMO) return (await loadDemo()).demoStartSession(scenarioId);
  return (
    await apiClient.post<{ id: number }>(
      `/student/speaking-scenarios/${scenarioId}/sessions`,
      null,
      { params: { swapped } },
    )
  ).data;
}

/**
 * The same scenario seen from the other side: AI lines become the learner's and the roles trade
 * places. Mirrors the server, which validates and reviews a swapped session against this script.
 */
export function swapScenarioRoles(scenario: SpeakingScenario): SpeakingScenario {
  return {
    ...scenario,
    aiRole: scenario.studentRole,
    studentRole: scenario.aiRole,
    script: scenario.script.map((line) => ({
      ...line,
      speaker: line.speaker === "AI" ? "STUDENT" : "AI",
    })),
  };
}

/** Sends the recording of one learner line and returns its scores and AI feedback. */
export async function submitSpeakingTurn(
  sessionId: number,
  lineIndex: number,
  audio: Blob,
): Promise<SpeakingTurnResult> {
  if (SPEAKING_DEMO) return (await loadDemo()).demoSubmitTurn(sessionId, lineIndex);
  const form = new FormData();
  form.append("lineIndex", String(lineIndex));
  form.append("audio", audio);
  return (
    await apiClient.post<SpeakingTurnResult>(`/student/speaking-sessions/${sessionId}/turns`, form)
  ).data;
}

export async function finishSpeakingSession(sessionId: number): Promise<SpeakingSessionResult> {
  if (SPEAKING_DEMO) return (await loadDemo()).demoFinishSession(sessionId);
  return (
    await apiClient.post<SpeakingSessionResult>(`/student/speaking-sessions/${sessionId}/finish`)
  ).data;
}

export async function getSpeakingSession(sessionId: number): Promise<SpeakingSessionResult> {
  if (SPEAKING_DEMO) return (await loadDemo()).demoGetSession(sessionId);
  return (await apiClient.get<SpeakingSessionResult>(`/student/speaking-sessions/${sessionId}`))
    .data;
}

export function scriptLineText(line: SpeakingScriptLine): string {
  return line.segments.map((segment) => segment.text).join("");
}

/** Colour band for a 0-100 pronunciation score. */
export function scoreLevel(score: number): "good" | "mid" | "low" {
  if (score >= 85) return "good";
  return score >= 60 ? "mid" : "low";
}

export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
