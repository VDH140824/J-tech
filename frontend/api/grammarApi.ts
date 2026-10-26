import { apiClient } from "../services/api";

export interface GrammarItem {
  id: number;
  lessonId: number;
  structureName: string;
  meaningVi: string;
  usageExplanation: string;
  exampleJp: string;
  exampleVi: string;
  videoUrl?: string;
  videoDurationSec?: number;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  createdAt?: string;
  updatedAt?: string;
}

export interface GrammarFormInput {
  structureName: string;
  meaningVi: string;
  usageExplanation: string;
  exampleJp: string;
  exampleVi: string;
  videoUrl?: string;
  videoPublicId?: string;
  videoDurationSec?: number;
  displayOrder?: number;
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
}

export interface GrammarVideoUpload {
  videoUrl: string;
  publicId: string;
  duration?: number;
}

export async function getGrammarsByLesson(lessonId: number, status?: string): Promise<GrammarItem[]> {
  const params: Record<string, string> = {};
  if (status && status !== "ALL") params.status = status;
  const { data } = await apiClient.get<GrammarItem[]>(`/lessons/${lessonId}/grammars`, { params });
  return data;
}

export async function getGrammarById(id: number): Promise<GrammarItem> {
  const { data } = await apiClient.get<GrammarItem>(`/grammars/${id}`);
  return data;
}

export async function createGrammar(lessonId: number, payload: GrammarFormInput): Promise<GrammarItem> {
  const { data } = await apiClient.post<GrammarItem>(`/lessons/${lessonId}/grammars`, payload);
  return data;
}

export async function uploadGrammarVideo(file: File): Promise<GrammarVideoUpload> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<GrammarVideoUpload>("/grammars/videos", formData);
  return data;
}

export async function updateGrammar(id: number, payload: GrammarFormInput): Promise<GrammarItem> {
  const { data } = await apiClient.put<GrammarItem>(`/grammars/${id}`, payload);
  return data;
}

export async function deleteGrammar(id: number): Promise<void> {
  await apiClient.delete(`/grammars/${id}`);
}
