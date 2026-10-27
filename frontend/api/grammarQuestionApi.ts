import { apiClient } from "../services/api";

export interface GrammarQuestion {
  id: number;
  skill: "GRAMMAR";
  questionType: "MCQ" | "FILL_IN" | "MATCHING";
  lessonId: number | null;
  content: string;
  mediaUrl: string | null;
  explanation: string | null;
  answerData: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isExerciseQuestion: boolean;
  displayOrder: number;
  status: "ACTIVE";
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface GrammarQuestionUpdateInput {
  questionType: GrammarQuestion["questionType"];
  content: string;
  explanation: string | null;
  answerData: string;
  difficulty: GrammarQuestion["difficulty"];
  displayOrder: number;
}

export interface GrammarQuestionCreateInput {
  questionType: GrammarQuestion["questionType"];
  lessonId: number;
  content: string;
  explanation: string | null;
  answerData: string;
  difficulty: GrammarQuestion["difficulty"];
  isExerciseQuestion: boolean;
  displayOrder: number;
}

export async function getAllGrammarQuestions(): Promise<GrammarQuestion[]> {
  const { data } = await apiClient.get<GrammarQuestion[]>("/grammar-questions");
  return data;
}

export async function updateQuestionGrammar(id: number, payload: GrammarQuestionUpdateInput): Promise<GrammarQuestion> {
  const { data } = await apiClient.put<GrammarQuestion>(`/questions/${id}`, payload);
  return data;
}

export async function createQuestionGrammar(payload: GrammarQuestionCreateInput): Promise<GrammarQuestion> {
  const { data } = await apiClient.post<GrammarQuestion>("/questions", payload);
  return data;
}
