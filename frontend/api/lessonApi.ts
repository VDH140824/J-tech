import { apiClient } from "../services/api";

export type SkillType = "KANJI" | "VOCABULARY" | "GRAMMAR" | "LISTENING" | "READING";

export interface LessonSummary {
  id: number;
  chapterId: number;
  skillType: SkillType;
  lessonNo: number;
  title: string;
  description?: string;
  documents?: string;
  displayOrder: number;
  status: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonFormInput {
  skillType?: SkillType;
  lessonNo: number;
  title: string;
  description?: string;
  documentFile?: File;
  displayOrder?: number;
  status?: "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
}

export async function getLessonsByChapter(
  chapterId: number,
  skillType?: SkillType,
  status?: string,
  courseId?: number
): Promise<LessonSummary[]> {
  const params: Record<string, string> = {};
  if (skillType) {
    params.skillType = skillType;
  }
  if (status && status !== "ALL") {
    params.status = status;
  }

  // Use the existing working endpoint /chapters/{chapterId}/lessons
  const { data } = await apiClient.get<LessonSummary[]>(`/chapters/${chapterId}/lessons`, { params });
  return data;
}

export async function getLessonById(id: number): Promise<LessonSummary> {
  const { data } = await apiClient.get<LessonSummary>(`/lessons/${id}`);
  return data;
}

export async function createLesson(
  chapterId: number,
  payload: LessonFormInput,
  courseId?: number
): Promise<LessonSummary> {
  const { data } = await apiClient.post<LessonSummary>(`/chapters/${chapterId}/lessons`, lessonFormData(payload));
  return data;
}

export async function updateLesson(
  id: number,
  payload: LessonFormInput
): Promise<LessonSummary> {
  const { data } = await apiClient.put<LessonSummary>(`/lessons/${id}`, lessonFormData(payload));
  return data;
}

export async function deleteLesson(id: number): Promise<void> {
  await apiClient.delete(`/lessons/${id}`);
}

function lessonFormData(payload: LessonFormInput): FormData {
  const { documentFile, ...request } = payload;
  const body = new FormData();
  body.append("request", new Blob([JSON.stringify(request)], { type: "application/json" }));
  if (documentFile) body.append("file", documentFile);
  return body;
}
