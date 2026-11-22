import type { StudentKanjiCard } from "../../../api/studentKanjiApi";

export interface KanjiFruitCard {
  id: number;
  kanji: string;
  meaning: string;
  answer: string;
}

export interface FlyingFruit {
  id: string;
  label: string;
  fruitType: number;
  correct: boolean;
  x: number;
  drift: number;
  sway: number;
  arc: number;
  speed: number;
  progress: number;
}

export interface KanjiFruitRound {
  index: number;
  score: number;
  lives: number;
  combo: number;
  bestCombo: number;
  answered: number;
  missed: number;
  cards: KanjiFruitCard[];
  fruits: FlyingFruit[];
  selected: KanjiFruitCard | null;
  phase: "ready" | "playing" | "paused" | "finished";
  message: string;
}

export const STARTING_LIVES = 3;

export function toKanjiFruitCards(cards: StudentKanjiCard[]): KanjiFruitCard[] {
  return cards.flatMap((card) => {
    const answer = card.sinoVietnamese?.trim();
    if (!card.characterText.trim() || !answer) return [];
    return [{ id: card.id, kanji: card.characterText, meaning: card.meaningVi, answer }];
  });
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function startKanjiFruitRound(cards: KanjiFruitCard[]): KanjiFruitRound {
  const deck = shuffled(cards);
  const first = deck[0] ?? null;
  return {
    index: first ? 1 : 0, score: 0, lives: STARTING_LIVES, combo: 0, bestCombo: 0, answered: 0, missed: 0,
    cards: deck, fruits: first ? createFruits(deck, first) : [], selected: first,
    phase: first ? "ready" : "finished", message: "",
  };
}

function createFruits(cards: KanjiFruitCard[], selected: KanjiFruitCard): FlyingFruit[] {
  const others = shuffled(cards.filter((card) => card.id !== selected.id))
    .filter((card, index, all) => all.findIndex((item) => item.answer.toLocaleLowerCase("vi") === card.answer.toLocaleLowerCase("vi")) === index)
    .slice(0, 3);
  const options = shuffled([selected, ...others]);
  const slots = options.length >= 4 ? [12, 31, 69, 88] : options.length === 3 ? [16, 50, 84] : options.length === 2 ? [28, 72] : [50];
  const positions = shuffled(slots);
  return options.map((card, index) => ({
    id: `${selected.id}-${index}`,
    label: card.answer,
    fruitType: (selected.id + index) % 8,
    correct: card.id === selected.id,
    x: positions[index],
    drift: Math.random() * 24 - 12,
    sway: Math.random() * 12 - 6,
    arc: 34 + Math.random() * 13,
    speed: .82 + Math.random() * .36,
    progress: Math.random() * .1,
  }));
}

export function chooseKanjiFruit(round: KanjiFruitRound, fruitId: string): KanjiFruitRound {
  if (round.phase !== "playing") return round;
  const fruit = round.fruits.find((item) => item.id === fruitId);
  if (!fruit) return round;
  if (!fruit.correct) {
    return { ...round, fruits: round.fruits.filter((item) => item.id !== fruitId), lives: Math.max(0, round.lives - 1), combo: 0, missed: round.missed + 1, message: "Sai rồi, thử trái khác!" , phase: round.lives <= 1 ? "finished" : "playing" };
  }
  const nextIndex = round.index;
  const next = round.cards[nextIndex] ?? null;
  const combo = round.combo + 1;
  const score = round.score + 100 + (combo % 10 === 0 ? 100 : 0);
  if (!next) return { ...round, score, combo, bestCombo: Math.max(combo, round.bestCombo), answered: round.answered + 1, fruits: [], selected: null, phase: "finished", message: "Chém chuẩn!" };
  return {
    ...round, index: nextIndex + 1, score, combo, bestCombo: Math.max(combo, round.bestCombo), answered: round.answered + 1,
    selected: next, fruits: createFruits(round.cards, next), message: "Chém chuẩn!",
  };
}

export function advanceKanjiFruit(round: KanjiFruitRound, delta: number): KanjiFruitRound {
  if (round.phase !== "playing") return round;
  const fruits = round.fruits.map((fruit) => ({ ...fruit, progress: fruit.progress + delta / 7200 * fruit.speed }));
  const expired = fruits.filter((fruit) => fruit.progress >= 1);
  if (expired.length) {
    const missedCorrect = expired.some((fruit) => fruit.correct);
    const remaining = fruits.filter((fruit) => fruit.progress < 1);
    if (!missedCorrect) return { ...round, fruits: remaining };

    const lives = Math.max(0, round.lives - 1);
    const selected = missedCorrect ? round.cards[round.index] ?? null : round.selected;
    if (!lives || !selected) return { ...round, fruits: [], lives, combo: 0, missed: round.missed + 1, selected, phase: "finished", message: "Quả rơi mất! Đáp án: " + (round.selected?.answer ?? "") };
    return { ...round, index: round.index + 1, lives, combo: 0, missed: round.missed + 1, selected, fruits: createFruits(round.cards, selected), message: "Quả rơi mất! Đáp án: " + (round.selected?.answer ?? "") };
  }
  return { ...round, fruits };
}
