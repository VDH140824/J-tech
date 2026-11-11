import { apiClient } from "../services/api";

export interface CommentResponse {
  id: number;
  postId: number;
  userId: number;
  commenterName: string | null;
  commenterAvatar: string | null;
  content: string | null;
  attachmentUrl: string | null;
  parentId: number | null;
  createdAt: string;
  updatedAt: string | null;
  deleted: boolean;
  replies: CommentResponse[];
}

export async function createComment(classId: number, postId: number, content: string, parentId: number | null, attachment: File | null) {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify({ content, parentId })], { type: "application/json" }));
  if (attachment) form.append("attachment", attachment);
  const { data } = await apiClient.post<CommentResponse>(`/classes/${classId}/posts/${postId}/comments`, form);
  return data;
}
export async function updateComment(classId: number, postId: number, commentId: number,
  content: string, removeAttachment: boolean, attachment: File | null) {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify({ content, removeAttachment })], { type: "application/json" }));
  if (attachment) form.append("attachment", attachment);
  const { data } = await apiClient.put<CommentResponse>(`/classes/${classId}/posts/${postId}/comments/${commentId}`, form);
  return data;
}
export async function deleteComment(classId: number, postId: number, commentId: number) {
  await apiClient.delete(`/classes/${classId}/posts/${postId}/comments/${commentId}`);
}
