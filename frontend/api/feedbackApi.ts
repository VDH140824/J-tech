import { apiClient } from "../services/api";

export type FeedbackStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
export type FeedbackPortal = "student" | "moderator" | "admin";
export const feedbackStatuses: Record<FeedbackStatus, string> = {
  PENDING: "Chờ xử lý", IN_PROGRESS: "Đang xử lý", RESOLVED: "Đã xử lý", REJECTED: "Từ chối",
};
export const feedbackCategories: Record<string, string> = {
  LESSON: "Nội dung bài học", LECTURE: "Bài giảng / học liệu", QUESTION: "Câu hỏi", SYSTEM: "Lỗi hệ thống", UX: "Trải nghiệm người dùng", OTHER: "Góp ý khác",
};
export interface FeedbackInput {
  feedbackType: "CONTENT" | "TECHNICAL"; category: string; title: string; content: string;
  lessonId?: number; questionId?: number;
}
export interface Feedback extends FeedbackInput {
  id: number; status: FeedbackStatus; attachmentUrl: string | null; resolutionNote: string | null;
  createdAt: string; resolvedAt: string | null; submitterName: string; submitterEmail: string;
  handlerName: string | null; lessonTitle: string | null; chapterId: number | null;
  courseId: number | null; courseName: string | null; skillType: string | null; contentAvailable: boolean | number;
}
export interface FeedbackReference { id: number; title: string; chapterTitle: string; courseName: string; courseId: number; }
export interface FeedbackNotification { id: number; title: string; content: string; linkUrl: string; isRead: boolean; createdAt: string; }
export interface FeedbackPage { content: Feedback[]; totalElements: number; page: number; size: number; }
export const feedbackPath = (portal: FeedbackPortal) => portal === "student" ? "/feedback" : `/${portal}/feedback`;
export async function submitFeedback(input: FeedbackInput, image?: File) {
  const form = new FormData();
  form.append("feedback", new Blob([JSON.stringify(input)], { type: "application/json" }));
  if (image) form.append("image", image);
  return (await apiClient.post<Feedback>("/feedback", form)).data;
}
