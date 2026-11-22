import { apiClient } from "../services/api";

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
