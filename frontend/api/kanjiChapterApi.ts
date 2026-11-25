import { apiClient } from "../services/api";
import type { KanjiInput, KanjiItem, KanjiPage } from "./kanjiApi";
import type { KanjiExercise, KanjiExerciseInput, KanjiExercisePage } from "./kanjiExerciseApi";

export interface KanjiDocument {
  lessonId: number;
  name: string;
  url: string;
  publicId: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  exerciseCount: number;
  sharedLesson: boolean;
}

export interface KanjiChapterContent {
  chapterId: number;
  chapterNo: number;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  documents: string;
  documentItems: KanjiDocument[];
  unassignedExerciseCount: number;
}

const base = (chapterId: number) => `/moderator/kanji/chapters/${chapterId}/content`;

export async function getKanjiChapter(chapterId: number, signal?: AbortSignal) {
  return (await apiClient.get<KanjiChapterContent>(base(chapterId), { signal })).data;
}

export async function uploadKanjiDocument(chapterId: number, file: File, name?: string) {
  const body = new FormData();
  body.append("file", file);
  if (name !== undefined) body.append("name", name);
  return (await apiClient.post<KanjiChapterContent>(`${base(chapterId)}/documents`, body)).data;
}

export async function renameKanjiDocument(chapterId: number, document: KanjiDocument, name: string) {
  return (await apiClient.patch<KanjiChapterContent>(`${base(chapterId)}/documents/name`, {
    lessonId: document.lessonId, url: document.url, name,
  })).data;
}

export async function deleteKanjiDocument(chapterId: number, document: KanjiDocument) {
  return (await apiClient.delete<{ content: KanjiChapterContent; warnings: string[] }>(
    `${base(chapterId)}/documents`, { data: { url: document.url, lessonId: document.lessonId } },
  )).data;
}

export async function prepareKanjiDocument(chapterId: number, document: KanjiDocument) {
  return (await apiClient.post<{ content: KanjiChapterContent; lessonId: number }>(
    `${base(chapterId)}/documents/prepare`, { lessonId: document.lessonId, url: document.url },
  )).data;
}

export async function assignKanjiExercise(chapterId: number, id: number, lessonId: number) {
  return (await apiClient.post<KanjiExercise>(`${base(chapterId)}/exercises/${id}/assign`, { lessonId })).data;
}

export async function listChapterKanji(chapterId: number, search: string, status: string, page: number, signal?: AbortSignal) {
  return (await apiClient.get<KanjiPage>(`${base(chapterId)}/cards`, {
    params: { search, status: status === "ALL" ? undefined : status, page, size: 10 }, signal,
  })).data;
}

export async function getChapterKanji(chapterId: number, id: number) {
  return (await apiClient.get<KanjiItem>(`${base(chapterId)}/cards/${id}`)).data;
}

export async function saveChapterKanji(chapterId: number, id: number | undefined, input: KanjiInput, image?: File) {
  const body = new FormData();
  const { removeImage, ...fields } = input;
  body.append("request", new Blob([JSON.stringify(id === undefined ? fields : input)], { type: "application/json" }));
  if (image) body.append("image", image);
  return (await apiClient.request<KanjiItem>({
    method: id === undefined ? "POST" : "PUT",
    url: `${base(chapterId)}/cards${id === undefined ? "" : `/${id}`}`,
    data: body,
  })).data;
}

export async function deleteChapterKanji(chapterId: number, id: number) {
  const response = await apiClient.delete<{ result: "ARCHIVED" }>(`${base(chapterId)}/cards/${id}`);
  return response.status === 204 ? "DELETED" : response.data.result;
}

export async function listChapterKanjiExercises(chapterId: number, page: number, status: string, signal?: AbortSignal,
  documentLessonId?: number, unassigned = false) {
  return (await apiClient.get<KanjiExercisePage>(`${base(chapterId)}/exercises`, {
    params: { page, size: 10, status: status || undefined, documentLessonId, unassigned }, signal,
  })).data;
}

export async function getChapterKanjiExercise(chapterId: number, id: number, documentLessonId?: number) {
  return (await apiClient.get<KanjiExercise>(`${base(chapterId)}/exercises/${id}`, { params: { documentLessonId } })).data;
}

export async function saveChapterKanjiExercise(chapterId: number, id: number | undefined, input: KanjiExerciseInput, documentLessonId?: number) {
  return (await apiClient.request<KanjiExercise>({
    method: id === undefined ? "POST" : "PUT",
    url: `${base(chapterId)}/exercises${id === undefined ? "" : `/${id}`}`,
    data: input,
    params: { documentLessonId },
  })).data;
}

export async function deleteChapterKanjiExercise(chapterId: number, id: number, documentLessonId?: number) {
  return (await apiClient.delete<{ result: "DELETED" | "ARCHIVED" }>(`${base(chapterId)}/exercises/${id}`, { params: { documentLessonId } })).data.result;
}

export async function changeChapterKanjiExerciseStatus(chapterId: number, id: number,
  status: KanjiExercise["status"], documentLessonId?: number) {
  return (await apiClient.patch<KanjiExercise>(`${base(chapterId)}/exercises/${id}/status`, { status },
    { params: { documentLessonId } })).data;
}

export interface KanjiExcelError { row: number; column: string; message: string }

export async function importKanjiExercises(chapterId: number, documentLessonId: number, file: File) {
  const body = new FormData();
  body.append("file", file);
  return (await apiClient.post<{ importedCount: number }>(`${base(chapterId)}/exercises/import`, body,
    { params: { documentLessonId } })).data;
}

export async function downloadKanjiExcel(chapterId: number, documentLessonId?: number, status?: string) {
  const template = documentLessonId === undefined;
  const response = await apiClient.get<Blob>(`${base(chapterId)}/exercises/${template ? "template" : "export"}`,
    { responseType: "blob", params: template ? undefined : { documentLessonId, status: status || undefined } });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = template ? "Kanji_template.xlsx" : "Kanji_exercises.xlsx";
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
