import { apiClient } from "../services/api";

export type StudentGameType = "VOCABULARY_RAIN" | "KANJI_FRUIT";

export interface StudentGameResultRequest {
  sessionId: string;
  gameType: StudentGameType;
  title: string;
  correctCount: number;
  totalCount: number;
}

export interface StudentGameResult {
  id: number;
  sessionId: string;
  gameType: StudentGameType;
  title: string;
  correctCount: number;
  totalCount: number;
  coinAwarded: number;
}

export async function submitStudentGameResult(result: StudentGameResultRequest): Promise<StudentGameResult> {
  return (await apiClient.post<StudentGameResult>("/student/games/results", result)).data;
}

export function createGameSessionId() {
  return crypto.randomUUID();
}
