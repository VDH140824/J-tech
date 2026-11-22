import axios from "axios";
import { apiClient } from "../services/api";
import type { KanjiExerciseInput } from "./kanjiExerciseApi";

export interface KanjiTestInput {
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  questions: KanjiExerciseInput[];
}
export interface ChapterKanjiQuestion {
  id: number;
  lessonId: number;
  lessonNo: number;
  lessonTitle: string;
  published: boolean;
  question: KanjiExerciseInput;
}
export interface KanjiTestSetup {
  bank: ChapterKanjiQuestion[];
  id: number | null;
  test: KanjiTestInput | null;
}
export interface TestQuestion {
  id: string;
  type: "MCQ" | "FILL_IN" | "MATCHING";
  content: string;
  options: string[];
  left: string[];
  right: string[];
  answer: string | null;
  explanation: string | null;
  correct: boolean | null;
}
export interface KanjiAttempt {
  id: number;
  chapterId: number;
  title: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED";
  deadlineAt: string;
  submittedAt: string | null;
  serverTime: string;
  score: number | null;
  passed: boolean;
  passingScore: number;
  correctCount: number;
  questions: TestQuestion[];
  answers: Record<string, string>;
}
const moderatorBase = (chapterId: number) =>
  `/moderator/kanji/chapters/${chapterId}/test`;
const studentBase = "/student/kanji-tests";
export async function getKanjiTestSetup(
  chapterId: number,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<KanjiTestSetup>(moderatorBase(chapterId), { signal })
  ).data;
}
export async function saveKanjiTest(chapterId: number, input: KanjiTestInput) {
  return (await apiClient.put<KanjiTestSetup>(moderatorBase(chapterId), input))
    .data;
}
export async function startKanjiTest(chapterId: number, id: number) {
  return (
    await apiClient.post<KanjiAttempt>(
      `${studentBase}/chapters/${chapterId}/${id}/start`,
    )
  ).data;
}
export async function latestKanjiTest(chapterId: number, signal?: AbortSignal) {
  return (
    (
      await apiClient.get<KanjiAttempt | null>(
        `${studentBase}/chapters/${chapterId}/latest`,
        { signal },
      )
    ).data || null
  );
}
export async function getKanjiAttempt(id: number) {
  return (await apiClient.get<KanjiAttempt>(`${studentBase}/attempts/${id}`))
    .data;
}
export async function saveKanjiAnswers(
  id: number,
  answers: Record<string, string>,
  submit = false,
) {
  return (
    await apiClient.request<KanjiAttempt>({
      method: submit ? "POST" : "PUT",
      url: `${studentBase}/attempts/${id}/${submit ? "submit" : "answers"}`,
      data: { answers },
    })
  ).data;
}
export function kanjiTestError(error: unknown) {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data?.message === "string"
  )
    return error.response.data.message as string;
  return "Không thể tải hoặc lưu bài Test. Vui lòng thử lại.";
}
