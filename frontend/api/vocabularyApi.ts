import { apiClient } from "../services/api";
import type { LessonSummary } from "./lessonApi";
export type VocabularyStatus = LessonSummary["status"];
export type BulkVocabularyStatus = Exclude<VocabularyStatus, "ARCHIVED">;
export interface VocabularyInput {
  displayOrder: number;
  status: VocabularyStatus;
  [field: string]: string | number | null | undefined;
}
export interface VocabularyItem extends VocabularyInput {
  id: number;
  lessonId?: number | null;
}
export async function getVocabularies(path: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<VocabularyItem[]>(path, { signal });
  return data;
}
export async function saveVocabulary(
  path: string,
  lessonId: number,
  input: VocabularyInput,
  id?: number,
) {
  return id === undefined
    ? apiClient.post(path, input)
    : apiClient.put(`/lessons/${lessonId}/vocabularies/${id}`, input);
}
export async function archiveVocabulary(lessonId: number, id: number) {
  await apiClient.delete(`/lessons/${lessonId}/vocabularies/${id}`);
}
export async function updateVocabularyStatuses(
  lessonId: number,
  ids: number[],
  status: BulkVocabularyStatus,
) {
  const { data } = await apiClient.patch<{ updatedCount: number }>(
    `/lessons/${lessonId}/vocabularies/status`,
    { ids, status },
  );
  return data.updatedCount;
}
export async function getChapterVocabularies(chapterId: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<VocabularyItem[]>(
    `/chapters/${chapterId}/vocabularies`,
    { signal },
  );
  return data;
}
export async function assignVocabulariesToLesson(lessonId: number, ids: number[]) {
  const { data } = await apiClient.patch<{ updatedCount: number }>(
    `/lessons/${lessonId}/vocabularies/assign`,
    { ids },
  );
  return data.updatedCount;
}
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
}
export async function getChapterVocabularyCards(chapterId: number, signal?: AbortSignal) {
  return (
    await apiClient.get<ChapterVocabularyCard[]>(
      `/moderator/vocabulary/chapters/${chapterId}/flashcards`,
      { signal },
    )
  ).data;
}
export async function getStudentChapterVocabularyCards(chapterId: number, signal?: AbortSignal) {
  return (
    await apiClient.get<ChapterVocabularyCard[]>(
      `/student/vocabulary/chapters/${chapterId}/flashcards`,
      { signal },
    )
  ).data;
}
