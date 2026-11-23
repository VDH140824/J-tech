import { apiClient } from "../services/api";

export interface StudentKanjiExerciseQuestion {
  id: number;
  questionType: "MCQ" | "FILL_IN" | "MATCHING";
  content: string;
  options: string[];
  leftItems: string[];
  rightItems: string[];
}
export interface StudentKanjiExerciseAnswer { value?: string; matches?: Record<string, string> }
export interface StudentKanjiExerciseResult {
  correctCount: number;
  total: number;
  questions: { id: number; correct: boolean; correctAnswer: string; matches: Record<string, string>; explanation: string }[];
}
export async function getStudentKanjiExercises(lessonId: number, signal?: AbortSignal) {
  return (await apiClient.get<StudentKanjiExerciseQuestion[]>(`/student/lessons/${lessonId}/kanji-exercises`, { signal })).data;
}
export async function submitStudentKanjiExercises(lessonId: number, questionIds: number[], answers: Record<number, StudentKanjiExerciseAnswer>) {
  return (await apiClient.post<StudentKanjiExerciseResult>(`/student/lessons/${lessonId}/kanji-exercises/submit`, { questionIds, answers })).data;
}

export interface StudentKanjiTest {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number;
}

export async function getStudentKanjiTests(
  chapterId: number,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<StudentKanjiTest[]>(
      `/student/chapters/${chapterId}/kanji-tests`,
      { signal },
    )
  ).data;
}

export interface StudentKanjiCard {
  id: number;
  characterText: string;
  sinoVietnamese: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  meaningVi: string;
  examples: string | null;
  imageUrl: string | null;
  mnemonicStory: string | null;
  remembered: boolean;
}

export async function getStudentKanjiCards(
  lessonId: number,
  signal?: AbortSignal,
) {
  return (
    await apiClient.get<StudentKanjiCard[]>(
      `/student/lessons/${lessonId}/kanji-flashcards`,
      { signal },
    )
  ).data;
}

export async function saveStudentKanjiProgress(
  chapterId: number,
  kanjiId: number,
  remembered: boolean,
) {
  await apiClient.put(
    `/student/chapters/${chapterId}/kanji-flashcards/${kanjiId}/progress`,
    { remembered },
  );
}

export interface ChapterKanjiCard extends StudentKanjiCard {
  lessonId: number;
  lessonNo: number;
  lessonTitle: string;
}
export async function getChapterKanjiCards(
  chapterId: number,
  signal?: AbortSignal,
  moderator = false,
): Promise<ChapterKanjiCard[]> {
  const url = moderator
    ? `/moderator/kanji/chapters/${chapterId}/flashcards`
    : `/student/chapters/${chapterId}/kanji-flashcards`;
  const { data } = await apiClient.get<
    {
      lessonId: number;
      lessonNo: number;
      lessonTitle: string;
      card: StudentKanjiCard;
    }[]
  >(url, { signal });
  return data.map(({ card, ...lesson }) => ({ ...card, ...lesson }));
}
