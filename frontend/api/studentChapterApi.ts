import { apiClient } from '../services/api';
export interface StudentLesson {
    id: number;
    lessonNo: number;
    title: string;
    skillType: string;
    itemCount: number;
    videoCount: number;
    durationSeconds: number;
    exerciseCount: number;
    testCount: number;
    completed: boolean;
}
export interface StudentChapter {
    id: number;
    chapterNo: number;
    title: string;
    description?: string;
    testCount: number;
    lessons: StudentLesson[];
}
export interface StudentChapterList {
    id: number;
    name: string;
    description?: string;
    chapters: StudentChapter[];
}
export async function getStudentChapters(id: number, signal: AbortSignal) { const { data } = await apiClient.get<StudentChapterList>(`/student/courses/${id}/chapters`, { signal }); return data; }
