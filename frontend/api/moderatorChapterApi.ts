import { apiClient } from "../services/api";
import type { CourseStatus } from "./moderatorCourseApi";

export interface ChapterInput {
  chapterNo: number;
  title: string;
  description: string;
  displayOrder: number;
  status: CourseStatus;
}
export interface ModeratorChapter extends Omit<ChapterInput, "description"> {
  id: number;
  courseId: number;
  description?: string;
}
const path = (courseId: number) => `/moderator/courses/${courseId}/chapters`;
export async function listChapters(courseId: number, signal: AbortSignal) {
  return (await apiClient.get<ModeratorChapter[]>(path(courseId), { signal })).data;
}
export async function saveChapter(courseId: number, id: number | null, input: ChapterInput) {
  if (id === null) await apiClient.post(path(courseId), input);
  else await apiClient.put(`${path(courseId)}/${id}`, input);
}
export async function deleteChapter(courseId: number, id: number) {
  await apiClient.delete(`${path(courseId)}/${id}`);
}
