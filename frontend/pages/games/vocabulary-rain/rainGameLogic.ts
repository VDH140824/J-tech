import type { VocabularyItem } from "../../../api/vocabularyApi";

export interface RainWord {
  id: number;
  meaning: string;
  word: string;
  reading: string;
}

function normalizeAnswer(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, "").replace(/[ァ-ヶ]/g, (kana) =>
    String.fromCharCode(kana.charCodeAt(0) - 0x60),
  );
}

export function toRainWords(items: VocabularyItem[]): RainWord[] {
  return items.flatMap((item) => {
    const meaning = String(item.meaningVi ?? "").trim();
    const word = String(item.word ?? "").trim();
    const reading = String(item.reading ?? "").trim();
    if (item.status !== "PUBLISHED" || !meaning || !(reading || word)) return [];
    return [{ id: item.id, meaning, word, reading }];
  });
}

export function rainReading({ reading, word }: RainWord) {
  return (reading || word).normalize("NFKC").replace(/\s+/g, "");
}

interface FallingCard {
  word: RainWord;
  lane: number;
  startedAt: number;
  duration: number;
}

interface RainReveal {
  word: RainWord;
  lane: number;
  progress: number;
  kind: "correct" | "missed";
  until: number;
}

interface RainTyping {
  cardId: number;
  count: number;
}

export const STARTING_LIVES = 5;
const POINTS_PER_WORD = 10;

export interface RainRound {
  phase: "playing" | "paused" | "finished";
  words: RainWord[];
  active: FallingCard[];
  missed: RainWord[];
  reveals: RainReveal[];
  typing: RainTyping | null;
  inputRevision: number;
  nextWord: number;
  nextDrop: number;
  elapsed: number;
  lives: number;
  correct: number;
  feedback: string;
}

export function startRainRound(words: RainWord[]): RainRound {
  const shuffled = [...words];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return advanceRainRound({
    phase: "playing", words: shuffled, active: [], missed: [], reveals: [], typing: null, inputRevision: 0, nextWord: 0,
    nextDrop: 0, elapsed: 0, lives: STARTING_LIVES, correct: 0, feedback: "",
  }, 0);
}

export function cardProgress(card: FallingCard, elapsed: number) {
  return Math.min(1, (elapsed - card.startedAt) / card.duration);
}

export function roundScore(round: RainRound) {
  return round.correct * POINTS_PER_WORD;
}

function finishIfNeeded(round: RainRound): RainRound {
  if (!round.reveals.length && (round.lives === 0 || (round.nextWord === round.words.length && !round.active.length))) {
    return { ...round, phase: "finished" };
  }
  return round;
}

export function advanceRainRound(round: RainRound, delta: number): RainRound {
  if (round.phase !== "playing") return round;
  const elapsed = round.elapsed + Math.min(50, delta);
  const reveals = round.reveals.filter((reveal) => reveal.until > elapsed);
  if (!round.lives) return finishIfNeeded({ ...round, elapsed, reveals });
  const active: FallingCard[] = [];
  const expired: RainWord[] = [];
  for (const card of round.active) {
    if (cardProgress(card, elapsed) < 1) {
      active.push(card);
      continue;
    }
    expired.push(card.word);
    reveals.push({ word: card.word, lane: card.lane, progress: 1, kind: "missed", until: elapsed + 1250 });
  }
  const lives = Math.max(0, round.lives - expired.length);
  const next = finishIfNeeded({
    ...round, elapsed, active, lives, reveals,
    typing: active.some((card) => card.word.id === round.typing?.cardId) ? round.typing : null,
    missed: expired.length ? [...round.missed, ...expired] : round.missed,
    feedback: expired.length ? `Bỏ lỡ ${expired.map((word) => word.meaning).join(", ")}.` : round.feedback,
  });

  const stage = Math.min(2, Math.floor(round.nextWord / 3));
  if (lives && next.phase === "playing" && elapsed >= next.nextDrop && active.length < stage + 1) {
    const word = next.words[next.nextWord];
    if (word) {
      const firstLane = (next.nextWord + 1) % 3;
      const lanes = [firstLane, (firstLane + 1) % 3, (firstLane + 2) % 3];
      const lane = lanes.find((candidate) => active.every((card) => card.lane !== candidate))!;
      return {
        ...next,
        active: [...active, { word, lane, startedAt: elapsed, duration: 16000 - stage * 3000 }],
        nextWord: next.nextWord + 1,
        nextDrop: elapsed + 4200 - stage * 1100,
      };
    }
  }
  return next;
}

function findRainCard(round: RainRound, character: string) {
  let closest: FallingCard | undefined;
  for (const candidate of round.active) {
    if (!normalizeAnswer(rainReading(candidate.word)).startsWith(character)) continue;
    if (!closest || cardProgress(candidate, round.elapsed) > cardProgress(closest, round.elapsed)) closest = candidate;
  }
  return closest;
}

function completeRainCard(round: RainRound, card: FallingCard): RainRound {
  return {
    ...round,
    active: round.active.filter((item) => item !== card),
    typing: null,
    reveals: [...round.reveals, {
      word: card.word, lane: card.lane, progress: cardProgress(card, round.elapsed),
      kind: "correct", until: round.elapsed + 700,
    }],
    nextDrop: round.active.length === 1 ? Math.min(round.nextDrop, round.elapsed + 450) : round.nextDrop,
    correct: round.correct + 1,
    feedback: `+${POINTS_PER_WORD} điểm`,
  };
}

export function acceptRainComposition(round: RainRound, input: string, revision: number): RainRound {
  if (round.phase !== "playing" || !round.lives || round.inputRevision !== revision) return round;
  const pending = Array.from(normalizeAnswer(input));
  if (!pending.length) return round;

  const card = round.typing
    ? round.active.find((item) => item.word.id === round.typing?.cardId)
    : findRainCard(round, pending[0]);
  if (!card) return round;

  const answer = Array.from(normalizeAnswer(rainReading(card.word)));
  const count = round.typing?.count ?? 0;
  let matched = 0;
  while (matched < pending.length) {
    const typed = pending[matched];
    const expected = answer[count + matched];
    // Romaji IMEs may leave a trailing n unconverted until the next key.
    const pendingNasal = typed === "n" && expected === "ん" && matched === pending.length - 1;
    if (typed !== expected && !pendingNasal) break;
    matched++;
  }
  if (!matched) return round;

  const next = count + matched === answer.length
    ? completeRainCard(round, card)
    : { ...round, typing: { cardId: card.word.id, count: count + matched }, feedback: "" };
  return { ...next, inputRevision: revision + 1 };
}

export function typeRainCharacters(round: RainRound, input: string): RainRound {
  if (round.phase !== "playing" || !round.lives || !round.active.length) return round;
  let card = round.active.find((item) => item.word.id === round.typing?.cardId);
  let count = round.typing?.count ?? 0;
  let feedback = round.feedback;

  for (const character of normalizeAnswer(input)) {
    if (!card) card = findRainCard(round, character);
    const answer = card && Array.from(normalizeAnswer(rainReading(card.word)));
    if (!card || answer?.[count] !== character) {
      feedback = card ? "Chữ này chưa đúng. Gõ tiếp từ trên thẻ viền vàng." : "Gõ chữ đầu của một thẻ đang rơi.";
      continue;
    }
    count++;
    feedback = "";
    if (count === answer.length) return completeRainCard(round, card);
  }
  return { ...round, typing: card ? { cardId: card.word.id, count } : null, feedback };
}
