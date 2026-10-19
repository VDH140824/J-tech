import { apiClient } from "../services/api";
export interface CourseSummary { id:number; code:string; name:string; description?:string; thumbnailUrl?:string; chapterCount:number; }
export interface ChapterSummary { id:number; chapterNo:number; title:string; description?:string; }
export interface CourseDetail extends Omit<CourseSummary,"chapterCount"> { chapters:ChapterSummary[]; }
export async function getCourses(){ const {data}=await apiClient.get<CourseSummary[]>("/courses"); return data; }
export async function getCourse(id:number){ const {data}=await apiClient.get<CourseDetail>(`/courses/${id}`); return data; }
