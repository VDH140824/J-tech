import { apiClient } from "../services/api";

type Milestone = { id: number; targetDays: number; coinAmount: number };

export type StreakSummary = {
  currentStreak: number;
  longestStreak: number;
  nextMilestone: Milestone | null;
  learningDays: string[];
  today: string;
  streakStart: string | null;
  milestones: Milestone[];
};
export async function getStreakSummary() {
  return (await apiClient.get<StreakSummary>("/streak")).data;
}
