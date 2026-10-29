import { apiClient } from "../services/api";
import type { MiniTestInput, MiniTestResult, VocabularyMiniTest } from "./vocabularyMiniTestApi";

export interface ChapterBankQuestion {
  id: number;
  lessonId: number;
  lessonNo: number;
  lessonTitle: string;
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: string[];
  correctAnswer: string;
}
export interface ChapterTestSetup { test: VocabularyMiniTest | null; bank: ChapterBankQuestion[]; }
export type ChapterTestInput = Omit<MiniTestInput, "questions"> & { questionIds: number[] };
const path = (chapterId: number) => `/moderator/vocabulary/chapters/${chapterId}/test`;
export async function getChapterTest(chapterId: number, signal?: AbortSignal) {
  return (await apiClient.get<ChapterTestSetup>(path(chapterId), { signal })).data;
}
export async function saveChapterTest(chapterId: number, input: ChapterTestInput) {
  return (await apiClient.post<VocabularyMiniTest>(path(chapterId), input)).data;
}
export async function archiveChapterTest(chapterId: number) { await apiClient.delete(path(chapterId)); }
export async function gradeChapterTestPreview(chapterId: number, answers: Record<string, string>) {
  return (await apiClient.post<MiniTestResult>(`${path(chapterId)}/preview`, answers)).data;
}
