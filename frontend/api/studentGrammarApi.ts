import axios from "axios";
import { apiClient } from "../services/api";

// Màn Ngữ pháp của học viên — /api/student/grammar

export interface GrammarPoint {
  id: number;
  structureName: string;
  meaningVi: string | null;
  usageExplanation: string | null;
  exampleJp: string | null;
  exampleVi: string | null;
  videoUrl: string | null;
  videoDurationSec: number | null;
}

export interface GrammarAttemptSummary {
  id: number;
  attemptNo: number;
  status: "SUBMITTED" | "AUTO_SUBMITTED" | string;
  score: number | null;
  correctCount: number;
  totalQuestions: number;
  passed: boolean | null;
  submittedAt: string | null;
}

export interface GrammarMiniTestInfo {
  id: number;
  title: string;
  durationMinutes: number;
  passingScore: number;
  questionCount: number;
  inProgressAttemptId: number | null;
  attempts: GrammarAttemptSummary[];
}

export interface StudentGrammarLesson {
  id: number;
  chapterId: number;
  chapterNo: number;
  chapterTitle: string;
  courseName: string;
  lessonNo: number;
  title: string;
  description: string | null;
  grammars: GrammarPoint[];
  exerciseCount: number;
  miniTest: GrammarMiniTestInfo | null;
  /** Đã hoàn thành bài (đã nộp bài tập). */
  completed: boolean;
  bestExerciseScore: number | null;
}

/** Câu hỏi không kèm đáp án. MCQ: options; MATCHING: vế trái + vế phải đã xáo. */
export interface GrammarQuestion {
  id: number;
  questionType: "MCQ" | "FILL_IN" | "MATCHING";
  content: string;
  grammarName: string | null;
  options: { key: string; text: string }[];
  matchLeft: string[];
  matchRight: string[];
}

export interface GrammarQuestionResult {
  questionId: number;
  correct: boolean;
  yourAnswer: string | null;
  correctAnswer: string | null;
  matches: Record<string, string>;
  explanation: string | null;
}

export interface GrammarCheckResult {
  correctCount: number;
  totalQuestions: number;
  score: number;
  /** Bài đã được tính hoàn thành trong tiến độ (nộp bài tập là hoàn thành). */
  lessonCompleted: boolean;
  /** Lần nộp này là lần đầu hoàn thành bài. */
  firstCompletion: boolean;
  bestScore: number | null;
  results: GrammarQuestionResult[];
}

export interface GrammarAttempt {
  id: number;
  testId: number;
  lessonId: number;
  title: string;
  attemptNo: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED";
  durationMinutes: number;
  passingScore: number;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  questions: GrammarQuestion[];
  answers: Record<string, string>;
}

export interface GrammarAttemptResult {
  id: number;
  testId: number;
  lessonId: number;
  title: string;
  attemptNo: number;
  status: "SUBMITTED" | "AUTO_SUBMITTED" | string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passingScore: number;
  passed: boolean;
  timeSpentSec: number;
  submittedAt: string | null;
  questions: GrammarQuestion[];
  results: GrammarQuestionResult[];
}

const base = "/student/grammar";

export async function getStudentGrammarLesson(lessonId: number, signal?: AbortSignal) {
  return (await apiClient.get<StudentGrammarLesson>(`${base}/lessons/${lessonId}`, { signal })).data;
}

export async function getGrammarExercise(lessonId: number, signal?: AbortSignal) {
  return (await apiClient.get<{ lessonId: number; questions: GrammarQuestion[] }>(`${base}/lessons/${lessonId}/exercise`, {
    signal,
  })).data;
}

/** Chấm bài tập: questionIds = các câu đã được phát (5 câu ngẫu nhiên của lượt này). */
export async function checkGrammarExercise(lessonId: number, questionIds: number[], answers: Record<string, string>) {
  return (await apiClient.post<GrammarCheckResult>(`${base}/lessons/${lessonId}/exercise/check`, { questionIds, answers }))
    .data;
}

export async function startGrammarMiniTest(testId: number) {
  return (await apiClient.post<GrammarAttempt>(`${base}/mini-tests/${testId}/start`)).data;
}

export async function saveGrammarAnswers(attemptId: number, answers: Record<string, string>) {
  await apiClient.put(`${base}/attempts/${attemptId}/answers`, { answers });
}

export async function submitGrammarMiniTest(attemptId: number, answers: Record<string, string>) {
  return (await apiClient.post<GrammarAttemptResult>(`${base}/attempts/${attemptId}/submit`, { answers })).data;
}

export async function getGrammarResult(attemptId: number, signal?: AbortSignal) {
  return (await apiClient.get<GrammarAttemptResult>(`${base}/attempts/${attemptId}/result`, { signal })).data;
}

export function grammarError(error: unknown, fallback = "Không thể tải dữ liệu. Vui lòng thử lại.") {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string")
    return error.response.data.message as string;
  return fallback;
}
