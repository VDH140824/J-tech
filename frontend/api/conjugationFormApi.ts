import { apiClient } from "../services/api";

export type ContentStatus = "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED";

export interface ConjugationFormSummary {
  id: number;
  code: string;
  nameVi: string;
  nameJp: string;
  description?: string | null;
  materialContent: string;
  questionsPerPractice: number;
  displayOrder: number;
  status: ContentStatus;
  linkedQuestionCount: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface ConjugationFormInput {
  code: string;
  nameVi: string;
  nameJp: string;
  description?: string;
  materialContent: string;
  questionsPerPractice: number;
  displayOrder?: number;
  /** Chỉ gửi khi sửa; backend bỏ qua khi tạo mới (luôn DRAFT). */
  status?: ContentStatus;
}

export interface ConjugationFormPage {
  content: ConjugationFormSummary[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface ConjugationFormQuery {
  keyword?: string;
  status?: ContentStatus;
  page?: number;
  size?: number;
}

/** sd View Conjugation Forms, message 1.1: GET /api/moderator/conjugation-forms */
export async function getConjugationForms(query: ConjugationFormQuery): Promise<ConjugationFormPage> {
  const { data } = await apiClient.get<ConjugationFormPage>("/moderator/conjugation-forms", { params: query });
  return data;
}

/** Message 3.3 trong sequence diagram: POST /api/moderator/conjugation-forms */
export async function createConjugationForm(payload: ConjugationFormInput): Promise<ConjugationFormSummary> {
  const { data } = await apiClient.post<ConjugationFormSummary>("/moderator/conjugation-forms", payload);
  return data;
}

/** sd Update Conjugation Form, message 3.3: PUT /api/moderator/conjugation-forms/{id} */
export async function updateConjugationForm(id: number, payload: ConjugationFormInput): Promise<ConjugationFormSummary> {
  const { data } = await apiClient.put<ConjugationFormSummary>(`/moderator/conjugation-forms/${id}`, payload);
  return data;
}

/** Kết quả của sd Delete / Archive Conjugation Form. archived = true: chỉ chuyển sang Lưu trữ (BR-88). */
export interface DeleteConjugationFormResult {
  id: number;
  archived: boolean;
}

/** sd Delete / Archive Conjugation Form, message 3.1: DELETE /api/moderator/conjugation-forms/{id} */
export async function deleteConjugationForm(id: number): Promise<DeleteConjugationFormResult> {
  const { data } = await apiClient.delete<DeleteConjugationFormResult>(`/moderator/conjugation-forms/${id}`);
  return data;
}
