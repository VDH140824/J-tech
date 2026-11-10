import { apiClient } from "../services/api";

export type ClassroomStatus = "ACTIVE" | "ARCHIVED" | "CLOSED";

export interface ClassRequest { code: string; description: string | null; status: ClassroomStatus; }

export async function updateClass(id: number, request: ClassRequest): Promise<ClassResponse> {
  const { data } = await apiClient.put<ClassResponse>(`/classes/${id}`, request);
  return data;
}

export async function deleteClass(id: number): Promise<void> {
  await apiClient.delete(`/classes/${id}`);
}

export async function createClass(request: ClassRequest): Promise<ClassResponse> {
  const { data } = await apiClient.post<ClassResponse>("/classes", request);
  return data;
}

export interface ClassResponse {
  id: number;
  code: string;
  moderatorId: number;
  description: string | null;
  status: ClassroomStatus;
  createdAt: string;
  studentCount: number;
}

export async function getMyClasses(): Promise<ClassResponse[]> {
  const { data } = await apiClient.get<ClassResponse[]>("/classes/my");
  return data;
}

export type StudentStatus = "PENDING" | "ACTIVE" | "REJECTED" | "LOCKED";

export interface ClassStudentResponse {
  id: number;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  status: StudentStatus;
  joinedAt: string;
}

export interface ClassStudentPage {
  content: ClassStudentResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type SkippedEmailReason = "DUPLICATE_EMAIL" | "ACCOUNT_NOT_FOUND"
  | "INVALID_STUDENT_ACCOUNT" | "ALREADY_IN_CLASSROOM";

export interface SkippedEmail {
  email: string;
  reason: SkippedEmailReason;
}

export interface AddStudentsResponse {
  addedCount: number;
  skippedCount: number;
  skippedEmails: SkippedEmail[];
}

export async function addStudents(classId: number, emails: string[]): Promise<AddStudentsResponse> {
  const { data } = await apiClient.post<AddStudentsResponse>(`/classes/${classId}/students`, { emails });
  return data;
}

export async function removeStudent(classId: number, studentId: number): Promise<void> {
  await apiClient.delete(`/classes/${classId}/students/${studentId}`);
}

export async function getClassStudents(classId: number, search: string, status: StudentStatus | "",
  page: number, size: number): Promise<ClassStudentPage> {
  const { data } = await apiClient.get<ClassStudentPage>(`/classes/${classId}/students`, {
    params: { search, status, page, size },
  });
  return data;
}
