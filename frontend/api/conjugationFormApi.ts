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
  practiceQuestionCount: number;
  missingTheoryGroups: string[];
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

/** SD-29.5: một câu hỏi trong danh sách chọn câu luyện tập. selected = đang dùng cho luyện tập. */
export type QuestionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type VerbGroup = 1 | 2 | 3;

export interface PracticeQuestion {
  id: number;
  content: string;
  difficulty: QuestionDifficulty;
  selected: boolean;
  verb: string;
  reading: string;
  meaningVi: string;
  /** 0 = chưa xác định được nhóm (dữ liệu cũ) */
  verbGroup: 0 | VerbGroup;
  correctAnswer: string;
  acceptedAnswers: string[];
  options: string[];
  explanation: string | null;
}

/** SD-29.5, message 1.1: GET /api/moderator/conjugation-forms/{id}/practice-questions */
export async function getPracticeQuestions(id: number, difficulty?: QuestionDifficulty): Promise<PracticeQuestion[]> {
  const { data } = await apiClient.get<PracticeQuestion[]>(`/moderator/conjugation-forms/${id}/practice-questions`, {
    params: difficulty ? { difficulty } : undefined,
  });
  return data;
}

/** SD-29.5, message 3.1: PUT /api/moderator/conjugation-forms/{id}/practice-questions */
export async function updatePracticeQuestions(id: number, questionIds: number[]): Promise<ConjugationFormSummary> {
  const { data } = await apiClient.put<ConjugationFormSummary>(
    `/moderator/conjugation-forms/${id}/practice-questions`,
    questionIds,
  );
  return data;
}

/** UC-47 bước 5: dữ liệu Moderator nhập khi thêm / sửa câu hỏi thể chia. */
export interface ConjugationQuestionInput {
  verb: string;
  reading: string;
  meaningVi: string;
  verbGroup: VerbGroup;
  difficulty: QuestionDifficulty;
  correctAnswer: string;
  acceptedAnswers: string[];
  /** Phương án nhiễu cho trắc nghiệm (tối đa 3, có thể bỏ trống) */
  options: string[];
  explanation: string;
  isExerciseQuestion: boolean;
}

/** POST /api/moderator/conjugation-forms/{id}/questions */
export async function createConjugationQuestion(formId: number, payload: ConjugationQuestionInput): Promise<PracticeQuestion> {
  const { data } = await apiClient.post<PracticeQuestion>(`/moderator/conjugation-forms/${formId}/questions`, payload);
  return data;
}

/** PUT /api/moderator/conjugation-forms/{id}/questions/{questionId} */
export async function updateConjugationQuestion(
  formId: number,
  questionId: number,
  payload: ConjugationQuestionInput,
): Promise<PracticeQuestion> {
  const { data } = await apiClient.put<PracticeQuestion>(
    `/moderator/conjugation-forms/${formId}/questions/${questionId}`,
    payload,
  );
  return data;
}

/** DELETE /api/moderator/conjugation-forms/{id}/questions/{questionId} (xóa mềm) */
export async function deleteConjugationQuestion(formId: number, questionId: number): Promise<void> {
  await apiClient.delete(`/moderator/conjugation-forms/${formId}/questions/${questionId}`);
}
