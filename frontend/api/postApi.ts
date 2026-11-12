import { apiClient } from "../services/api";
import type { CommentResponse } from "./commentApi";

export interface PostResponse {
  id: number;
  classroomId: number;
  authorId: number;
  authorName: string | null;
  authorAvatar: string | null;
  title: string;
  content: string;
  attachmentUrl: string | null;
  dueAt: string | null;
  createdAt: string;
  commentCount: number;
}

export async function getPostsByClass(classId: number): Promise<PostResponse[]> {
  const { data } = await apiClient.get<PostResponse[]>(`/classes/${classId}/posts`);
  return data;
}

export interface PostDetailResponse { post: PostResponse; comments: CommentResponse[]; readOnly: boolean; }
export async function getPostDetail(classId: number, postId: number): Promise<PostDetailResponse> {
  const { data } = await apiClient.get<PostDetailResponse>(`/classes/${classId}/posts/${postId}`);
  return data;
}

export interface CreatePostRequest {
  postType: "ASSIGNMENT" | "ANNOUNCEMENT";
  title: string;
  content: string;
  dueAt: string | null;
}

export async function createPost(classId: number, request: CreatePostRequest, attachment: File | null): Promise<PostResponse> {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify(request)], { type: "application/json" }));
  if (attachment) form.append("attachment", attachment);
  const { data } = await apiClient.post<PostResponse>(`/classes/${classId}/posts`, form);
  return data;
}

export async function updatePost(classId: number, postId: number, request: CreatePostRequest, attachment: File | null): Promise<PostResponse> {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify(request)], { type: "application/json" }));
  if (attachment) form.append("attachment", attachment);
  const { data } = await apiClient.put<PostResponse>(`/classes/${classId}/posts/${postId}`, form);
  return data;
}

export async function deletePost(classId: number, postId: number): Promise<void> {
  await apiClient.delete(`/classes/${classId}/posts/${postId}`);
}
