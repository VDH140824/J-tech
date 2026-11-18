import { apiClient } from "../services/api";
import { isAxiosError } from "axios";

export type ExerciseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type QuestionType = "MCQ" | "FILL_IN" | "MATCHING";
export interface ExerciseQuestionInput {
  sourceVocabularyId?: number | null;
  questionType: QuestionType;
  content: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: string[];
  correctAnswer: string;
  matches: Record<string, string>;
}
export interface ExerciseInput {
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  status: ExerciseStatus;
  questions: ExerciseQuestionInput[];
}
export interface ExerciseQuestion extends ExerciseQuestionInput {
  id: number;
}
export interface VocabularyExercise extends Omit<ExerciseInput, "questions"> {
  id: number;
  lessonId: number | null;
  chapterId: number | null;
  questionCount: number;
  attemptCount: number;
  questions: ExerciseQuestion[];
}
export interface ExerciseResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  questions: {
    questionId: number;
    correct: boolean;
    correctAnswer: string;
    matches: Record<string, string>;
    explanation: string;
  }[];
}
export interface StudentVocabularyExercise
  extends Pick<VocabularyExercise, "id" | "title" | "description" | "durationMinutes" | "passingScore"> {
  questions: (Pick<ExerciseQuestion, "id" | "questionType" | "content" | "options"> & {
    matchingPrompts: string[];
    matchingOptions: string[];
  })[];
}

export async function getStudentVocabularyExercise(lessonId: number, signal: AbortSignal) {
  return (await apiClient.get<StudentVocabularyExercise>(`/lessons/${lessonId}/vocabulary-exercise`, { signal })).data;
}

export async function submitStudentVocabularyExercise(
  exercise: StudentVocabularyExercise,
  answers: Record<string, string>,
) {
  return (await apiClient.post<ExerciseResult>(`/vocabulary-exercises/${exercise.id}/submit`, {
    questionIds: exercise.questions.map((question) => question.id),
    answers,
  })).data;
}
const base = "/moderator/vocabulary";
export async function getExercises(lessonId: number, signal?: AbortSignal) {
  return (
    await apiClient.get<VocabularyExercise[]>(`${base}/lessons/${lessonId}/mini-tests`, { signal })
  ).data;
}
export async function getExercise(id: number) {
  return (await apiClient.get<VocabularyExercise>(`${base}/mini-tests/${id}`)).data;
}
export async function archiveExercise(id: number) {
  await apiClient.delete(`${base}/mini-tests/${id}`);
}
export async function saveExercise(
  lessonId: number,
  input: ExerciseInput,
) {
  return (await apiClient.post<VocabularyExercise>(`${base}/lessons/${lessonId}/mini-tests`, input))
    .data;
}
export async function importExerciseQuestions(lessonId: number, file: File) {
  const form = new FormData();
  form.append("file", file);
  return (await apiClient.post<VocabularyExercise>(`${base}/lessons/${lessonId}/mini-tests/import`, form)).data;
}
export function exerciseError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 404)
      return "Không tìm thấy API exercise. Hãy khởi động lại backend bản code mới và kiểm tra địa chỉ API.";
    if (typeof error.response?.data?.message === "string") return error.response.data.message;
  }
  return "Không thể tải hoặc lưu dữ liệu. Vui lòng thử lại.";
}
export async function gradeExercisePreview(id: number, answers: Record<string, string>) {
  return (await apiClient.post<ExerciseResult>(`${base}/mini-tests/${id}/preview`, answers)).data;
}
