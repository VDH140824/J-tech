import { apiClient } from "../services/api";
import type { LessonSummary } from "./lessonApi";
export type VocabularyStatus = LessonSummary["status"];
export interface VocabularyInput {
  displayOrder: number;
  status: VocabularyStatus;
  [field: string]: string | number;
}
export interface VocabularyItem extends VocabularyInput { id: number; }
export async function getVocabularies(path: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<VocabularyItem[]>(path, { signal });
  return data;
}
export async function saveVocabulary(path: string, itemPath: string, input: VocabularyInput, id?: number) {
  return id === undefined ? apiClient.post(path, input) : apiClient.put(`${itemPath}/${id}`, input);
}
export async function archiveVocabulary(path: string, id: number) { await apiClient.delete(`${path}/${id}`); }
export interface ChapterVocabularyCard {
  id: number;
  lessonId: number;
  lessonNo: number;
  lessonTitle: string;
  word: string;
  reading: string;
  meaningVi: string;
  exampleJp: string | null;
  exampleVi: string | null;
  audioUrl: string | null;
}
export async function getChapterVocabularyCards(chapterId: number, signal?: AbortSignal) {
  return (await apiClient.get<ChapterVocabularyCard[]>(`/moderator/vocabulary/chapters/${chapterId}/flashcards`, { signal })).data;
}
