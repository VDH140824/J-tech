import { apiClient } from "../services/api";

/** 0 = Tất cả nhóm, 1–3 = Nhóm 1–3. */
export type VerbGroupFilter = 0 | 1 | 2 | 3;
export type PracticeMode = "typed" | "choice";
/** "ALL" = mọi độ khó. */
export type DifficultyFilter = "ALL" | "EASY" | "MEDIUM" | "HARD";

export interface ConjugationFormCard {
  id: number;
  code: string;
  nameVi: string;
  nameJp: string;
  description: string | null;
  questionsPerPractice: number;
  questionCount: number;
  attemptCount: number;
  bestScore: number | null;
  passed: boolean;
}

export interface ConjugationFormDetail {
  id: number;
  code: string;
  nameVi: string;
  nameJp: string;
  description: string | null;
  materialContent: string;
  verbGroup: VerbGroupFilter;
  difficulty: DifficultyFilter;
  questionsPerPractice: number;
  /** Số câu theo nhóm, trong độ khó đang chọn */
  questionCountByGroup: Record<string, number>;
  /** Số câu theo độ khó (ALL, EASY, MEDIUM, HARD), trong nhóm đang chọn */
  questionCountByDifficulty: Record<string, number>;
  attemptCount: number;
  bestScore: number | null;
  passed: boolean;
}

export interface ConjugationQuestion {
  id: number;
  instruction: string;
  verb: string;
  reading: string;
  meaningVi: string;
  verbGroup: 1 | 2 | 3 | null;
  options: string[] | null;
}

export interface ConjugationPracticeSession {
  formId: number;
  nameVi: string;
  nameJp: string;
  verbGroup: VerbGroupFilter;
  difficulty: DifficultyFilter;
  mode: PracticeMode;
  questionsPerPractice: number;
  questions: ConjugationQuestion[];
}

export interface ConjugationCheckResult {
  questionId: number;
  correct: boolean;
  correctAnswer: string;
  acceptedAnswers: string[];
  explanation: string | null;
}

export interface ConjugationPracticeResult {
  formId: number;
  verbGroup: VerbGroupFilter;
  totalQuestions: number;
  correctCount: number;
  score: number;
  passingScore: number;
  passed: boolean;
  coinsAwarded: number;
  details: ConjugationCheckResult[];
}

const BASE = "/conjugation-study/forms";

export async function listConjugationForms(
  keyword: string,
  group: VerbGroupFilter,
  difficulty: DifficultyFilter,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<ConjugationFormCard[]>(BASE, {
      params: { keyword: keyword || undefined, group, difficulty },
      signal,
    })
  ).data;
}

export async function getConjugationForm(
  formId: number,
  group: VerbGroupFilter,
  difficulty: DifficultyFilter,
  signal?: AbortSignal,
) {
  return (await apiClient.get<ConjugationFormDetail>(`${BASE}/${formId}`, { params: { group, difficulty }, signal })).data;
}

/** Bắt đầu một lượt luyện tập mới: server chọn ngẫu nhiên N câu. */
export async function startConjugationPractice(
  formId: number,
  group: VerbGroupFilter,
  difficulty: DifficultyFilter,
  mode: PracticeMode,
) {
  return (
    await apiClient.post<ConjugationPracticeSession>(`${BASE}/${formId}/sessions`, null, {
      params: { group, difficulty, mode },
    })
  ).data;
}

export async function checkConjugationAnswer(formId: number, questionId: number, answer: string) {
  return (await apiClient.post<ConjugationCheckResult>(`${BASE}/${formId}/check`, { questionId, answer })).data;
}

export async function submitConjugationPractice(
  formId: number,
  verbGroup: VerbGroupFilter,
  difficulty: DifficultyFilter,
  mode: PracticeMode,
  answers: Record<string, string>,
) {
  return (
    await apiClient.post<ConjugationPracticeResult>(`${BASE}/${formId}/submit`, {
      verbGroup,
      difficulty,
      mode,
      answers,
    })
  ).data;
}
