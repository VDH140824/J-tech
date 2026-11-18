import { apiClient } from "../services/api";
import type { LessonSummary } from "./lessonApi";

const base = (lessonId: number) => `/moderator/vocabulary/lessons/${lessonId}/documents`;

export async function uploadVocabularyDocument(lessonId: number, file: File, name: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("name", name);
  return (await apiClient.post<LessonSummary>(base(lessonId), body)).data;
}

export async function renameVocabularyDocument(lessonId: number, url: string, name: string) {
  return (await apiClient.patch<LessonSummary>(`${base(lessonId)}/name`, { url, name })).data;
}

export async function deleteVocabularyDocument(lessonId: number, url: string) {
  return (await apiClient.delete<LessonSummary>(base(lessonId), { data: { url } })).data;
}
