import { apiClient } from "../services/api";

export type KanjiStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
export interface KanjiInput {
  characterText: string; sinoVietnamese: string; onyomi: string; kunyomi: string;
  meaningVi: string; examples: string; mnemonicStory: string; removeImage: boolean;
  displayOrder?: number; status?: KanjiStatus;
}
export interface KanjiItem extends KanjiInput {
  id: number; lessonId: number; imageUrl?: string; imagePublicId?: string; createdAt?: string; updatedAt?: string; status: KanjiStatus; displayOrder: number;
}
export type KanjiSummary = Pick<KanjiItem, "id" | "characterText" | "sinoVietnamese" | "meaningVi" | "imageUrl" | "status" | "displayOrder">;
export interface KanjiPage { content: KanjiSummary[]; totalElements: number; totalPages: number }
export async function listKanji(lessonId: number, search: string, status: string, page: number, signal?: AbortSignal) {
  return (await apiClient.get<KanjiPage>(`/lessons/${lessonId}/kanji`, {
    params: { search, status: status === "ALL" ? undefined : status, page, size: 10 }, signal,
  })).data;
}
export async function getKanji(id: number) {
  return (await apiClient.get<KanjiItem>(`/kanji/${id}`)).data;
}
export async function saveKanji(lessonId: number, id: number | undefined, input: KanjiInput, image?: File) {
  const form = new FormData();
  const { removeImage, ...fields } = input;
  form.append("request", new Blob([JSON.stringify(id ? input : fields)], { type: "application/json" }));
  if (image) form.append("image", image);
  return (await apiClient.request<KanjiItem>({ method: id ? "PUT" : "POST",
    url: id ? `/kanji/${id}` : `/lessons/${lessonId}/kanji`, data: form })).data;
}
export async function deleteKanji(id: number) {
  const response = await apiClient.delete<{ result: "ARCHIVED" }>(`/kanji/${id}`);
  return response.status === 204 ? "DELETED" : response.data.result;
}
