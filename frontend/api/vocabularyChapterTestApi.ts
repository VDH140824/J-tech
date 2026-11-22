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
  return (await apiClient.get<StudentVocabularyExercise>(studentPath(chapterId), { signal })).data;
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
