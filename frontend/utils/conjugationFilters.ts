import type { DifficultyFilter, PracticeMode, VerbGroupFilter } from "../api/studentConjugationApi";

export const GROUP_OPTIONS: ReadonlyArray<{ value: VerbGroupFilter; label: string }> = [
  { value: 0, label: "Tất cả nhóm" },
  { value: 1, label: "Nhóm 1" },
  { value: 2, label: "Nhóm 2" },
  { value: 3, label: "Nhóm 3" },
];

export function parseGroup(value: string | null): VerbGroupFilter {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

export const DIFFICULTY_OPTIONS: ReadonlyArray<{ value: DifficultyFilter; label: string }> = [
  { value: "ALL", label: "Tất cả độ khó" },
  { value: "EASY", label: "Dễ" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "HARD", label: "Khó" },
];

export function parseDifficulty(value: string | null): DifficultyFilter {
  return value === "EASY" || value === "MEDIUM" || value === "HARD" ? value : "ALL";
}

export function parseMode(value: string | null): PracticeMode {
  return value === "choice" ? "choice" : "typed";
}
