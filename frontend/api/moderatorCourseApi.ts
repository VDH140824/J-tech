import { apiClient } from "../services/api";
import type { CourseSummary, CourseDetail } from "./courseApi";
export type CourseStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";
export interface ModeratorCourse extends CourseSummary { status: CourseStatus; lessonCount: number; }
export interface CoursePage { content: ModeratorCourse[]; totalElements: number; totalPages: number; }
export async function listCourses(search: string, status: string, page: number, size: number, signal: AbortSignal) {
  const { data } = await apiClient.get<CoursePage>("/moderator/courses", { params: { search, status: status || undefined, page, size }, signal });
  return data;
}
export async function courseDetail(id: number, signal: AbortSignal) {
  const { data } = await apiClient.get<CourseDetail>(`/moderator/courses/${id}`, { signal });
  return data;
}

export interface CourseInput { code: string; name: string; description: string; thumbnailUrl: string; displayOrder: number; status: CourseStatus; }
export async function getCourseForEdit(id: number): Promise<CourseInput> {
  return (await apiClient.get(`/moderator/courses/${id}/edit`)).data;
}
export async function saveCourse(id: number | null, input: CourseInput) {
  if (id === null) await apiClient.post("/moderator/courses", input);
  else await apiClient.put(`/moderator/courses/${id}`, input);
}
export async function deleteCourse(id: number) { await apiClient.delete(`/moderator/courses/${id}`); }
