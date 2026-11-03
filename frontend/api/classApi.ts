import { apiClient } from "../services/api";

export type ClassroomStatus = "ACTIVE" | "ARCHIVED" | "CLOSED";

export interface ClassRequest { code: string; description: string | null; status: ClassroomStatus; }

export async function updateClass(id: number, request: ClassRequest): Promise<ClassResponse> {
  const { data } = await apiClient.put<ClassResponse>(`/classes/${id}`, request);
  return data;
}

export async function deleteClass(id: number): Promise<void> {
  await apiClient.delete(`/classes/${id}`);
}

export async function createClass(request: ClassRequest): Promise<ClassResponse> {
  const { data } = await apiClient.post<ClassResponse>("/classes", request);
  return data;
}

export interface ClassResponse {
  id: number;
  code: string;
  moderatorId: number;
  description: string | null;
  status: ClassroomStatus;
  createdAt: string;
  studentCount: number;
}

export async function getMyClasses(): Promise<ClassResponse[]> {
  const { data } = await apiClient.get<ClassResponse[]>("/classes/my");
  return data;
}
