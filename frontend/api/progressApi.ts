import { apiClient } from "../services/api";

export type LearningContentType = "VOCABULARY" | "KANJI" | "GRAMMAR";
export async function recordCompletion(contentType: LearningContentType, contentId: number) {
  return (await apiClient.post<{ learningDayAdded: boolean; currentStreak: number; longestStreak: number }>(
    "/progress/completions", { contentType, contentId },
  )).data;
}
