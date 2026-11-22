import { isAxiosError } from "axios";
import { apiClient } from "../services/api";

export interface CampusQuizCourse {
  id: number;
  code: string;
  name: string;
}

export interface CampusQuizQuestion {
  id: number;
  content: string;
  mediaUrl: string | null;
  options: { id: number; text: string }[];
}

export interface CampusQuizSession {
  sessionId: string;
  serverTime: string;
  expiresAt: string;
  questions: CampusQuizQuestion[];
}

export interface CampusQuizAnswer {
  questionId: number;
  optionId: number;
}

export type CampusQuizSubmissionMode = "MANUAL" | "TIMEOUT";

export interface CampusQuizResult {
  sessionId: string;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  coinAwarded: number;
  prayerEligible: boolean;
  questionResults: {
    questionId: number;
    selectedOptionId: number | null;
    correctOptionId: number;
    explanation: string | null;
  }[];
}

interface CampusQuizError {
  code?: string;
  message: string;
  availableCount?: number | null;
}

const path = "/campus-quiz";

export async function getCampusQuizCourses(signal: AbortSignal) {
  return (await apiClient.get<CampusQuizCourse[]>(`${path}/courses`, { signal })).data;
}

export async function startCampusQuiz(courseId: number) {
  return (await apiClient.post<CampusQuizSession>(`${path}/start`, { courseId })).data;
}

export async function submitCampusQuiz(sessionId: string, answers: CampusQuizAnswer[], mode: CampusQuizSubmissionMode) {
  return (await apiClient.post<CampusQuizResult>(`${path}/submit`, { sessionId, answers, mode }, { timeout: 15_000 })).data;
}

export function campusQuizError(error: unknown, fallback: string): CampusQuizError {
  const data = isAxiosError<CampusQuizError>(error) ? error.response?.data : undefined;
  return {
    code: data?.code,
    message: data?.code && data.message ? data.message : fallback,
    availableCount: data?.availableCount,
  };
}
