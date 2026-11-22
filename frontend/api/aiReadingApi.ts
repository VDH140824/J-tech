import { apiClient } from "../services/api";

export interface AiReadingQuestion {
  index: number;
  content: string;
  options: Partial<Record<string, string>>;
}

export interface AiReadingQuestionResult {
  index: number;
  selected: string | null;
  correctAnswer: string;
  correct: boolean;
  explanation: string | null;
}

export interface AiReadingResult {
  total: number;
  correct: number;
  score: number;
  passingScore: number;
  passed: boolean;
  coinsAwarded: number;
  translationVi: string | null;
  results: AiReadingQuestionResult[];
}

export interface AiReadingDetail {
  id: number;
  title: string;
  passageJp: string;
  courseId: number;
  courseName: string;
  chapterId: number | null;
  chapterNo: number | null;
  lessonId: number | null;
  status: "GENERATED" | "SUBMITTED";
  questions: AiReadingQuestion[];
  createdAt: string;
  /** null khi chưa nộp. */
  result: AiReadingResult | null;
}

export interface AiReadingHistoryItem {
  id: number;
  title: string;
  courseName: string;
  chapterNo: number | null;
  status: "GENERATED" | "SUBMITTED";
  totalQuestions: number;
  correctCount: number;
  coinsAwarded: number;
  createdAt: string;
  submittedAt: string | null;
}

export interface AiReadingPage {
  items: AiReadingHistoryItem[];
  page: number;
  size: number;
  total: number;
}

/** Ưu tiên lessonId (bài READING), sau đó chapterId, cuối cùng courseId. */
export interface AiReadingScope {
  lessonId?: number;
  courseId?: number;
  chapterId?: number;
}

export async function createAiReading(scope: AiReadingScope): Promise<AiReadingDetail> {
  return (await apiClient.post<AiReadingDetail>("/student/ai-reading", scope)).data;
}

export async function getAiReading(id: number): Promise<AiReadingDetail> {
  return (await apiClient.get<AiReadingDetail>(`/student/ai-reading/${id}`)).data;
}

/** answers: chỉ số câu ("0", "1", ...) → chữ cái A–D. */
export async function submitAiReading(
  id: number,
  answers: Record<string, string>,
): Promise<AiReadingResult> {
  return (await apiClient.post<AiReadingResult>(`/student/ai-reading/${id}/submit`, { answers })).data;
}

export async function getAiReadingHistory(page = 0, size = 10): Promise<AiReadingPage> {
  return (await apiClient.get<AiReadingPage>("/student/ai-reading", { params: { page, size } })).data;
}
