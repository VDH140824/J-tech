import { apiClient } from "../services/api";

export type McqLetter = "A" | "B" | "C" | "D";

export interface ListeningLessonItem {
  lessonId: number;
  title: string;
  courseId: number;
  courseName: string;
  chapterNo: number | null;
  completed: boolean;
}

export interface ListeningQuestion {
  id: number;
  content: string;
  options: Partial<Record<McqLetter, string>>;
}

export interface ListeningDetail {
  lessonId: number;
  exerciseId: number;
  title: string;
  courseId: number;
  courseName: string;
  chapterNo: number | null;
  audioUrl: string | null;
  scriptJp: string;
  completed: boolean;
  questions: ListeningQuestion[];
}

export interface ListeningQuestionResult {
  questionId: number;
  selected: string | null;
  correctAnswer: string;
  correct: boolean;
  explanation: string | null;
}

export interface ListeningResult {
  total: number;
  correct: number;
  score: number;
  passingScore: number;
  passed: boolean;
  coinsAwarded: number;
  completed: boolean;
  results: ListeningQuestionResult[];
  scriptVi: string | null;
}

export async function getListeningList(courseId?: number): Promise<ListeningLessonItem[]> {
  return (
    await apiClient.get<ListeningLessonItem[]>("/student/listening", {
      params: courseId ? { courseId } : undefined,
    })
  ).data;
}

export async function getListening(lessonId: number): Promise<ListeningDetail> {
  return (await apiClient.get<ListeningDetail>(`/student/listening/${lessonId}`)).data;
}

/** answers: id câu hỏi → chữ cái A–D. */
export async function submitListening(
  lessonId: number,
  answers: Record<string, string>,
): Promise<ListeningResult> {
  return (
    await apiClient.post<ListeningResult>(`/student/listening/${lessonId}/submit`, { answers })
  ).data;
}
