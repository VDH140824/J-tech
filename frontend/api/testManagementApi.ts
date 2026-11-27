import { apiClient } from "../services/api";
import type {
  QuestionFormat,
  QuestionLevel,
  QuestionSkill,
} from "./questionBankApi";

export type ManagedTestType = "MINI_TEST" | "CHAPTER_TEST";
export type TestSkill = QuestionSkill | "ALL";
export type TestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface TestSummary {
  id: number;
  testType: ManagedTestType;
  skill: TestSkill;
  status: TestStatus;
  title: string;
  courseId: number | null;
  courseName: string | null;
  chapterId: number | null;
  chapterNo: number | null;
  chapterTitle: string | null;
  lessonId: number | null;
  lessonTitle: string | null;
  questionCount: number;
  durationMinutes: number;
  passingScore: number;
  attemptCount: number;
  updatedAt: string | null;
}

export interface TestQuestionItem {
  id: number;
  skill: QuestionSkill;
  questionType: QuestionFormat;
  difficulty: QuestionLevel;
  status: "ACTIVE" | "ARCHIVED";
  exerciseQuestion: boolean;
  content: string;
  answerData: string | null;
  lessonId: number | null;
  lessonTitle: string | null;
  lessonStatus: string | null;
  chapterId: number | null;
}

export interface TestDetail {
  summary: TestSummary;
  description: string | null;
  questions: TestQuestionItem[];
  locked: boolean;
}

export interface TestPage {
  content: TestSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface TestQuery {
  testType?: ManagedTestType;
  skill?: TestSkill;
  status?: TestStatus;
  courseId?: number;
  chapterId?: number;
  lessonId?: number;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface TestInput {
  testType: ManagedTestType;
  skill?: QuestionSkill | null;
  lessonId?: number | null;
  chapterId?: number | null;
  title: string;
  description?: string | null;
  durationMinutes: number;
  passingScore: number;
  questionIds: number[];
}

export interface CandidateQuery {
  testId?: number;
  testType?: ManagedTestType;
  testSkill?: QuestionSkill;
  lessonId?: number;
  chapterId?: number;
  skill?: QuestionSkill;
  questionType?: QuestionFormat;
  difficulty?: QuestionLevel;
  keyword?: string;
}

export interface TestDeleteResult {
  id: number;
  archived: boolean;
  reason: string | null;
}

export async function getTests(query: TestQuery): Promise<TestPage> {
  const { data } = await apiClient.get<TestPage>("/moderator/tests", {
    params: query,
  });
  return data;
}

export async function getTestDetail(id: number): Promise<TestDetail> {
  const { data } = await apiClient.get<TestDetail>(`/moderator/tests/${id}`);
  return data;
}

export async function getTestCandidates(
  query: CandidateQuery,
): Promise<TestQuestionItem[]> {
  const { data } = await apiClient.get<TestQuestionItem[]>(
    "/moderator/tests/candidates",
    { params: query },
  );
  return data;
}

export async function createTest(payload: TestInput): Promise<TestDetail> {
  const { data } = await apiClient.post<TestDetail>(
    "/moderator/tests",
    payload,
  );
  return data;
}

export async function updateTest(
  id: number,
  payload: TestInput,
): Promise<TestDetail> {
  const { data } = await apiClient.put<TestDetail>(
    `/moderator/tests/${id}`,
    payload,
  );
  return data;
}

export async function publishTest(id: number): Promise<TestDetail> {
  const { data } = await apiClient.put<TestDetail>(
    `/moderator/tests/${id}/publish`,
  );
  return data;
}

export async function unpublishTest(id: number): Promise<TestDetail> {
  const { data } = await apiClient.put<TestDetail>(
    `/moderator/tests/${id}/unpublish`,
  );
  return data;
}

export async function deleteTest(id: number): Promise<TestDeleteResult> {
  const { data } = await apiClient.delete<TestDeleteResult>(
    `/moderator/tests/${id}`,
  );
  return data;
}

/** BR-T4, BR-T5: giới hạn theo loại đề (số câu tối thiểu chỉ áp dụng khi xuất bản). */
export const TEST_LIMITS: Record<ManagedTestType, {
  minQuestions: number;
  maxQuestions: number;
  minMinutes: number;
  maxMinutes: number;
  defaultMinutes: number;
}> = {
  MINI_TEST: { minQuestions: 5, maxQuestions: 20, minMinutes: 5, maxMinutes: 20, defaultMinutes: 15 },
  CHAPTER_TEST: { minQuestions: 10, maxQuestions: 15, minMinutes: 15, maxMinutes: 40, defaultMinutes: 30 },
};

export const TEST_TYPE_LABEL: Record<ManagedTestType, string> = {
  MINI_TEST: "Mini test",
  CHAPTER_TEST: "Test chương",
};

export const TEST_SKILL_LABEL: Record<TestSkill, string> = {
  VOCABULARY: "Từ vựng",
  KANJI: "Kanji",
  GRAMMAR: "Ngữ pháp",
  ALL: "Tổng hợp",
};

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Lưu trữ",
};

export function answerPreview(item: TestQuestionItem): string {
  if (!item.answerData) return "—";
  try {
    const data = JSON.parse(item.answerData) as {
      options?: string[] | Record<string, string>;
      correctAnswer?: string;
      matches?: Record<string, string>;
    };
    if (item.questionType === "MATCHING") {
      return (
        Object.entries(data.matches ?? {})
          .map(([left, right]) => `${left} ↔ ${right}`)
          .join(" · ") || "—"
      );
    }
    const correct = data.correctAnswer ?? "";
    if (
      data.options &&
      !Array.isArray(data.options) &&
      correct in data.options
    ) {
      return `${correct}. ${data.options[correct]}`;
    }
    return correct || "—";
  } catch {
    return "—";
  }
}
