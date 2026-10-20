import { apiClient } from "../services/api";

export interface CourseSummary {
  id: number;
  code: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  chapterCount: number;
}

export interface ChapterSummary {
  id: number;
  chapterNo: number;
  title: string;
  description?: string;
}

export interface CourseDetail extends Omit<CourseSummary, "chapterCount"> {
  chapters: ChapterSummary[];
}

export interface ChapterDetail {
  id: number;
  chapterNo: number;
  title: string;
  description?: string;
  displayOrder?: number;
  status?: string;
  courseId: number;
  courseName?: string;
  courseCode?: string;
}

export async function getCourses(): Promise<CourseSummary[]> {
  const { data } = await apiClient.get<CourseSummary[]>("/courses");
  return data;
}

export async function getCourse(id: number): Promise<CourseDetail> {
  const { data } = await apiClient.get<CourseDetail>(`/courses/${id}`);
  return data;
}

export async function getChapter(courseId: number, chapterId: number): Promise<ChapterDetail> {
  const { data } = await apiClient.get<ChapterDetail>(`/courses/${courseId}/chapters/${chapterId}`);
  return data;
}
