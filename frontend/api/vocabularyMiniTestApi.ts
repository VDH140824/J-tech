import { apiClient } from "../services/api";
import { isAxiosError } from "axios";

export type MiniTestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type QuestionType = "MCQ" | "FILL_IN" | "MATCHING";
export interface MiniTestQuestionInput {
  sourceVocabularyId?: number | null;
  questionType: QuestionType;
  content: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: string[];
  correctAnswer: string;
  matches: Record<string, string>;
}
export interface MiniTestInput {
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  status: MiniTestStatus;
  questions: MiniTestQuestionInput[];
}
export interface MiniTestQuestion extends MiniTestQuestionInput { id: number; }
export interface VocabularyMiniTest extends Omit<MiniTestInput, "questions"> {
  id: number;
  lessonId: number | null;
  chapterId: number | null;
  questionCount: number;
  attemptCount: number;
  questions: MiniTestQuestion[];
}
export interface MiniTestResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  questions: { questionId: number; correct: boolean; correctAnswer: string; matches: Record<string, string>; explanation: string }[];
}
const base = "/moderator/vocabulary";
export async function getMiniTests(lessonId: number, signal?: AbortSignal) {
  return (await apiClient.get<VocabularyMiniTest[]>(`${base}/lessons/${lessonId}/mini-tests`, { signal })).data;
}
export async function getMiniTest(id: number) {
  return (await apiClient.get<VocabularyMiniTest>(`${base}/mini-tests/${id}`)).data;
}
export async function archiveMiniTest(id: number) { await apiClient.delete(`${base}/mini-tests/${id}`); }
export async function generateMiniTest(lessonId: number, input: Omit<MiniTestInput, "questions">) {
  return (await apiClient.post<VocabularyMiniTest>(`${base}/lessons/${lessonId}/mini-tests`, input)).data;
}
export function miniTestError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 404) return "Không tìm thấy API mini-test. Hãy khởi động lại backend bản code mới và kiểm tra địa chỉ API.";
    if (typeof error.response?.data?.message === "string") return error.response.data.message;
  }
  return "Không thể tải hoặc lưu dữ liệu. Vui lòng thử lại.";
}
export async function gradeMiniTestPreview(id: number, answers: Record<string, string>) {
  return (await apiClient.post<MiniTestResult>(`${base}/mini-tests/${id}/preview`, answers)).data;
}
