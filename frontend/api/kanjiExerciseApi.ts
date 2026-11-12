import axios from "axios";
import { apiClient } from "../services/api";

export type KanjiQuestionType = "MCQ" | "FILL_IN" | "MATCHING";
export type KanjiDifficulty = "EASY" | "MEDIUM" | "HARD";
export interface KanjiExerciseInput {
  questionType: KanjiQuestionType;
  content: string;
  explanation: string;
  difficulty: KanjiDifficulty;
  displayOrder: number;
  options: string[];
  correctAnswer: string;
  matches: Record<string, string>;
}
export interface KanjiExercise extends KanjiExerciseInput {
  id: number;
  lessonId: number;
  status: "ACTIVE" | "ARCHIVED";
}
export interface KanjiExercisePage {
  content: KanjiExercise[];
  totalElements: number;
  totalPages: number;
}
const base = (lessonId: number) =>
  `/moderator/kanji/lessons/${lessonId}/exercises`;
export async function listKanjiExercises(
  lessonId: number,
  page: number,
  status: string,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<KanjiExercisePage>(base(lessonId), {
      params: { page, size: 10, status: status || undefined },
      signal,
    })
  ).data;
}
export async function getKanjiExercise(lessonId: number, id: number) {
  return (await apiClient.get<KanjiExercise>(`${base(lessonId)}/${id}`)).data;
}
export async function saveKanjiExercise(
  lessonId: number,
  id: number | undefined,
  input: KanjiExerciseInput,
) {
  return id === undefined
    ? (await apiClient.post<KanjiExercise>(base(lessonId), input)).data
    : (await apiClient.put<KanjiExercise>(`${base(lessonId)}/${id}`, input))
        .data;
}
export async function deleteKanjiExercise(lessonId: number, id: number) {
  return (
    await apiClient.delete<{ result: "DELETED" | "ARCHIVED" }>(
      `${base(lessonId)}/${id}`,
    )
  ).data.result;
}
export function kanjiExerciseError(e: unknown) {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 401)
      return "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.";
    if (e.response?.status === 403)
      return "Bạn không có quyền quản lý bài tập Kanji.";
    if (
      e.response &&
      e.response.status < 500 &&
      typeof e.response.data?.message === "string"
    )
      return e.response.data.message as string;
  }
  return "Không thể tải hoặc lưu bài tập. Vui lòng thử lại.";
}
