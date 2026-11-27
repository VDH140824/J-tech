import { apiClient } from "../services/api";
import type {
  ExerciseInput,
  ExerciseResult,
  StudentVocabularyExercise,
  VocabularyExercise,
} from "./vocabularyExerciseApi";

export interface ChapterBankQuestion {
  id: number;
  lessonId: number;
  lessonNo: number;
  lessonTitle: string;
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  options: string[];
  correctAnswer: string;
}
export interface ChapterTestSetup {
  test: VocabularyExercise | null;
  bank: ChapterBankQuestion[];
}
export interface StudentVocabularyChapterTest {
  id: number;
  chapterId: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  passingScore: number;
  questions: StudentVocabularyChapterQuestion[];
  inProgressAttemptId: number | null;
  attempts: StudentVocabularyChapterAttemptSummary[];
}
export interface StudentVocabularyChapterQuestion {
  id: number;
  questionType: "MCQ" | "FILL_IN" | "MATCHING";
  content: string;
  options: string[];
}
export interface StudentVocabularyChapterAttemptSummary {
  id: number;
  attemptNo: number;
  status: string;
  score: number | null;
  correctCount: number;
  totalQuestions: number;
  passed: boolean | null;
  submittedAt: string | null;
}
export interface StudentVocabularyChapterAttempt {
  id: number;
  testId: number;
  chapterId: number;
  title: string;
  attemptNo: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED";
  durationMinutes: number;
  passingScore: number;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  questions: StudentVocabularyChapterQuestion[];
  answers: Record<string, string>;
}
export interface StudentVocabularyChapterResult {
  id: number;
  testId: number;
  chapterId: number;
  title: string;
  attemptNo: number;
  status: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passingScore: number;
  passed: boolean;
  timeSpentSec: number;
  submittedAt: string | null;
  questions: StudentVocabularyChapterQuestionResult[];
}
export interface StudentVocabularyChapterQuestionResult {
  questionId: number;
  questionType: string;
  content: string;
  options: string[];
  yourAnswer: string | null;
  correctAnswer: string;
  correct: boolean;
  explanation: string | null;
}
export type ChapterTestInput = Omit<ExerciseInput, "questions"> & { questionIds: number[] };
const path = (chapterId: number) => `/moderator/vocabulary/chapters/${chapterId}/test`;
const studentPath = (chapterId: number) => `/student/vocabulary/chapters/${chapterId}/test`;
export async function getChapterTest(chapterId: number, signal?: AbortSignal) {
  return (await apiClient.get<ChapterTestSetup>(path(chapterId), { signal })).data;
}
export async function saveChapterTest(chapterId: number, input: ChapterTestInput) {
  return (await apiClient.post<VocabularyExercise>(path(chapterId), input)).data;
}
export async function archiveChapterTest(chapterId: number) {
  await apiClient.delete(path(chapterId));
}
export async function gradeChapterTestPreview(chapterId: number, answers: Record<string, string>) {
  return (await apiClient.post<ExerciseResult>(`${path(chapterId)}/preview`, answers)).data;
}
export async function getStudentVocabularyChapterTest(
  chapterId: number,
  signal?: AbortSignal,
) {
  return (await apiClient.get<StudentVocabularyChapterTest>(studentPath(chapterId), { signal })).data;
}
export async function startStudentVocabularyChapterTest(chapterId: number) {
  return (await apiClient.post<StudentVocabularyChapterAttempt>(`${studentPath(chapterId)}/start`)).data;
}
export async function getStudentVocabularyChapterAttempt(chapterId: number, attemptId: number) {
  return (await apiClient.get<StudentVocabularyChapterAttempt>(
    `/student/vocabulary/chapters/${chapterId}/attempts/${attemptId}`,
  )).data;
}
export async function saveStudentVocabularyChapterAnswers(
  chapterId: number,
  attemptId: number,
  answers: Record<string, string>,
) {
  await apiClient.put(`/student/vocabulary/chapters/${chapterId}/attempts/${attemptId}/answers`, { answers });
}
export async function submitStudentVocabularyChapterAttempt(
  chapterId: number,
  attemptId: number,
  answers: Record<string, string>,
) {
  return (await apiClient.post<StudentVocabularyChapterResult>(
    `/student/vocabulary/chapters/${chapterId}/attempts/${attemptId}/submit`,
    { answers },
  )).data;
}
export async function getStudentVocabularyChapterResult(chapterId: number, attemptId: number) {
  return (await apiClient.get<StudentVocabularyChapterResult>(
    `/student/vocabulary/chapters/${chapterId}/attempts/${attemptId}/result`,
  )).data;
}
export async function submitStudentVocabularyChapterTest(
  chapterId: number,
  test: StudentVocabularyExercise,
  answers: Record<string, string>,
) {
  return (
    await apiClient.post<ExerciseResult>(`${studentPath(chapterId)}/submit`, {
      testId: test.id,
      questionIds: test.questions.map((question) => question.id),
      answers,
    })
  ).data;
}
