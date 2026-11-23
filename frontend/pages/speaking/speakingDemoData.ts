/**
 * Sample data for the speaking screens, used only when VITE_SPEAKING_DEMO=true.
 *
 * Nothing here listens to the learner's recording: every score and comment is
 * a fixed example. Delete this file (and the demo branches in api/speakingApi.ts)
 * once the backend endpoints exist.
 */
import type {
  SpeakingScenario,
  SpeakingSessionResult,
  SpeakingTurnResult,
  SpeakingWordScore,
} from "../../api/speakingApi";

const SCENARIO_ID = 1;

const completedByChapter = new Map<number, number>();

function ramenScenario(chapterId: number): SpeakingScenario {
  return {
    id: SCENARIO_ID,
    chapterId,
    title: "Gọi món ở quán ramen",
    situation: "Bạn vào một quán ramen ở Nhật. Nhân viên đón khách, hỏi số người và nhận gọi món.",
    aiRole: "nhân viên 店員",
    studentRole: "khách 客",
    completedCount: completedByChapter.get(chapterId) ?? 0,
    script: [
      {
        speaker: "AI",
        segments: [{ text: "いらっしゃいませ。何名様ですか？" }],
        translation: "Xin chào quý khách. Quý khách đi mấy người ạ?",
      },
      {
        speaker: "STUDENT",
        segments: [{ text: "一人", free: true }, { text: "です。" }],
        translation: "Tôi đi một mình.",
        hint: "Có thể thay: 二人 (hai người), 三人 (ba người).",
      },
      {
        speaker: "AI",
        segments: [{ text: "こちらへどうぞ。ご注文はお決まりですか？" }],
        translation: "Mời quý khách đi lối này. Quý khách đã chọn món chưa ạ?",
      },
      {
        speaker: "STUDENT",
        segments: [
          { text: "すみません。" },
          { text: "ラーメン", free: true },
          { text: "を" },
          { text: "一つ", free: true },
          { text: "お願いします。" },
        ],
        translation: "Xin lỗi, cho tôi một bát ramen.",
        hint: "Có thể thay món (うどん, カレー) và số lượng (二つ, 三つ).",
      },
      {
        speaker: "AI",
        segments: [{ text: "かしこまりました。お飲み物はいかがですか？" }],
        translation: "Vâng ạ. Quý khách có dùng đồ uống không ạ?",
      },
      {
        speaker: "STUDENT",
        segments: [{ text: "お水", free: true }, { text: "をください。" }],
        translation: "Cho tôi nước lọc.",
        hint: "Có thể thay: お茶 (trà), コーラ (cola).",
      },
      {
        speaker: "AI",
        segments: [{ text: "お待たせしました。ラーメンとお水です。" }],
        translation: "Xin lỗi đã để quý khách đợi. Ramen và nước của quý khách đây ạ.",
      },
      {
        speaker: "STUDENT",
        segments: [{ text: "ありがとうございます。", free: true }],
        translation: "Cảm ơn.",
        hint: "Có thể cảm ơn theo cách khác, ví dụ どうも。",
      },
      {
        speaker: "AI",
        segments: [{ text: "ごゆっくりどうぞ。" }],
        translation: "Chúc quý khách ngon miệng.",
      },
    ],
  };
}

/** Example results per learner line. Line 3 is a real Azure Pronunciation Assessment sample. */
const TURNS: Record<number, SpeakingTurnResult> = {
  1: {
    lineIndex: 1,
    recognizedText: "一人です。",
    words: [
      { text: "一人", accuracy: 78, free: true },
      { text: "です", accuracy: 93 },
    ],
    accuracy: 84,
    fluency: 90,
    completeness: 100,
    pronScore: 86.4,
    feedback: {
      verdict: "FOLLOWS_SCRIPT",
      comment: "Câu đúng như trong sách. 一人 (ひとり) nghe chưa rõ âm り, bạn luyện lại từ này.",
    },
  },
  3: {
    lineIndex: 3,
    recognizedText: "すみません。ラーメンを一つお願いします。",
    words: [
      { text: "すみません", accuracy: 60 },
      { text: "ラーメン", accuracy: 97, free: true },
      { text: "を", accuracy: 97 },
      { text: "一つ", accuracy: 64, free: true },
      { text: "お願い", accuracy: 94 },
      { text: "します", accuracy: 91 },
    ],
    accuracy: 84,
    fluency: 96,
    completeness: 100,
    pronScore: 88.8,
    feedback: {
      verdict: "FOLLOWS_SCRIPT",
      comment:
        "Câu đúng theo bài và đủ lịch sự. すみません và 一つ còn yếu: chú ý âm ん ở cuối và âm つ.",
    },
  },
  5: {
    lineIndex: 5,
    recognizedText: "お水をください。",
    words: [
      { text: "お水", accuracy: 88, free: true },
      { text: "を", accuracy: 95 },
      { text: "ください", accuracy: 90 },
    ],
    accuracy: 90,
    fluency: 94,
    completeness: 100,
    pronScore: 91.2,
    feedback: {
      verdict: "FOLLOWS_SCRIPT",
      comment: "Câu rõ ràng, đúng mẫu ～をください.",
    },
  },
  7: {
    lineIndex: 7,
    recognizedText: "ありがとうございます。",
    words: [
      { text: "ありがとう", accuracy: 92, free: true },
      { text: "ございます", accuracy: 86, free: true },
    ],
    accuracy: 88,
    fluency: 95,
    completeness: 100,
    pronScore: 90.3,
    feedback: {
      verdict: "FITS_SITUATION",
      comment: "Lời cảm ơn hợp với tình huống nhận món.",
    },
  },
};

interface DemoSession {
  chapterId: number;
  turns: SpeakingTurnResult[];
  result?: SpeakingSessionResult;
}

const sessions = new Map<number, DemoSession>();
let lastChapterId = 0;

export function demoScenarios(chapterId: number): SpeakingScenario[] {
  lastChapterId = chapterId;
  return [ramenScenario(chapterId)];
}

export function demoStartSession(_scenarioId: number): { id: number } {
  const id = sessions.size + 1;
  sessions.set(id, { chapterId: lastChapterId, turns: [] });
  return { id };
}

function requireSession(sessionId: number): DemoSession {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Demo session not found");
  return session;
}

export function demoSubmitTurn(sessionId: number, lineIndex: number): SpeakingTurnResult {
  const turn = TURNS[lineIndex];
  if (!turn) throw new Error("Not a learner line");
  requireSession(sessionId).turns.push(turn);
  return turn;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

export function demoFinishSession(sessionId: number): SpeakingSessionResult {
  const session = requireSession(sessionId);
  if (session.result) return session.result;
  const { turns } = session;
  const weakWords: SpeakingWordScore[] = turns
    .flatMap((turn) => turn.words)
    .filter((word) => word.accuracy < 85)
    .sort((a, b) => a.accuracy - b.accuracy);
  session.result = {
    id: sessionId,
    scenarioId: SCENARIO_ID,
    scenarioTitle: ramenScenario(session.chapterId).title,
    turnCount: turns.length,
    pronScore: average(turns.map((turn) => turn.pronScore)),
    accuracy: average(turns.map((turn) => turn.accuracy)),
    fluency: average(turns.map((turn) => turn.fluency)),
    completeness: average(turns.map((turn) => turn.completeness)),
    overallFeedback: turns.length
      ? "Bạn nói trôi chảy và giữ đúng mạch hội thoại. Điểm cần cải thiện là các âm ngắn như ん và つ ở cuối từ."
      : null,
    weakWords,
  };
  if (turns.length)
    completedByChapter.set(session.chapterId, (completedByChapter.get(session.chapterId) ?? 0) + 1);
  return session.result;
}

export function demoGetSession(sessionId: number): SpeakingSessionResult {
  const result = requireSession(sessionId).result;
  if (!result) throw new Error("Demo session not finished");
  return result;
}
