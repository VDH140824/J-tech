import { apiClient } from "../services/api";

// UC-39 Manage Question Bank — /api/moderator/question-bank

/** Ngân hàng câu hỏi chỉ gồm Từ vựng, Kanji, Ngữ pháp. */
export type QuestionSkill = "VOCABULARY" | "KANJI" | "GRAMMAR";
export type QuestionFormat = "MCQ" | "FILL_IN" | "MATCHING";
export type QuestionLevel = "EASY" | "MEDIUM" | "HARD";
export type QuestionState = "ACTIVE" | "ARCHIVED";

export interface QuestionBankSummary {
  id: number;
  skill: QuestionSkill;
  questionType: QuestionFormat;
  difficulty: QuestionLevel;
  status: QuestionState;
  content: string;
  exerciseQuestion: boolean;
  courseId: number | null;
  courseName: string | null;
  chapterId: number | null;
  chapterNo: number | null;
  chapterTitle: string | null;
  lessonId: number | null;
  lessonTitle: string | null;
  /** Điểm ngữ pháp mà câu hỏi gắn vào (kỹ năng Ngữ pháp) */
  targetName: string | null;
  updatedAt: string | null;
}

export interface QuestionBankDetail {
  summary: QuestionBankSummary;
  grammarId: number | null;
  explanation: string | null;
  options: string[];
  correctAnswer: string;
  matches: Record<string, string>;
  /** BR-29: đã có học viên làm → không đổi được đáp án */
  attempted: boolean;
  /** BR-13: true = xóa vĩnh viễn được, false = chỉ lưu trữ */
  canDelete: boolean;
  retentionReason: string | null;
  /** Các đề kiểm tra đang chứa câu hỏi */
  tests: QuestionTest[];
}

export type TestKind = "MINI_TEST" | "LESSON_TEST" | "CHAPTER_TEST";

/** Đề kiểm tra: mini test của bài học hoặc test chương (tổng hợp Kanji, Từ vựng, Ngữ pháp). */
export interface QuestionTest {
  id: number;
  testType: TestKind;
  skill: QuestionSkill | "ALL";
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  /** Đề đã có lượt làm → không thêm / bỏ câu hỏi được */
  locked: boolean;
}

export interface QuestionBankPage {
  content: QuestionBankSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface QuestionBankQuery {
  skill?: QuestionSkill;
  questionType?: QuestionFormat;
  status?: QuestionState;
  courseId?: number;
  chapterId?: number;
  lessonId?: number;
  keyword?: string;
  /** Lọc câu hỏi thuộc một bài test */
  testId?: number;
  page?: number;
  size?: number;
}

export interface QuestionBankTargets {
  courses: { id: number; name: string }[];
  chapters: { id: number; courseId: number; chapterNo: number; title: string }[];
  lessons: { id: number; chapterId: number; skillType: string; lessonNo: number; title: string }[];
  grammars: { id: number; lessonId: number; structureName: string }[];
  tests: { id: number; testType: TestKind; skill: string; title: string; chapterId: number | null; lessonId: number | null }[];
}

export interface QuestionBankInput {
  skill: QuestionSkill;
  questionType: QuestionFormat;
  lessonId?: number | null;
  grammarId?: number | null;
  content: string;
  explanation?: string | null;
  difficulty: QuestionLevel;
  isExerciseQuestion?: boolean;
  options?: string[];
  correctAnswer?: string;
  matches?: Record<string, string>;
}

export interface QuestionDeleteResult {
  id: number;
  /** BR-13: true = câu hỏi đã có dữ liệu học tập nên được chuyển sang Lưu trữ thay vì xóa */
  archived: boolean;
  reason: string | null;
}

export async function getQuestionBank(query: QuestionBankQuery): Promise<QuestionBankPage> {
  const { data } = await apiClient.get<QuestionBankPage>("/moderator/question-bank", { params: query });
  return data;
}

export async function getQuestionBankTargets(): Promise<QuestionBankTargets> {
  const { data } = await apiClient.get<QuestionBankTargets>("/moderator/question-bank/targets");
  return data;
}

export async function getQuestionDetail(id: number): Promise<QuestionBankDetail> {
  const { data } = await apiClient.get<QuestionBankDetail>(`/moderator/question-bank/${id}`);
  return data;
}

export async function createBankQuestion(payload: QuestionBankInput): Promise<QuestionBankDetail> {
  const { data } = await apiClient.post<QuestionBankDetail>("/moderator/question-bank", payload);
  return data;
}

export async function updateBankQuestion(id: number, payload: QuestionBankInput): Promise<QuestionBankDetail> {
  const { data } = await apiClient.put<QuestionBankDetail>(`/moderator/question-bank/${id}`, payload);
  return data;
}

/** BR-13: hệ thống tự quyết xóa vĩnh viễn hay chuyển Lưu trữ. */
export async function deleteBankQuestion(id: number): Promise<QuestionDeleteResult> {
  const { data } = await apiClient.delete<QuestionDeleteResult>(`/moderator/question-bank/${id}`);
  return data;
}

export async function archiveBankQuestion(id: number): Promise<QuestionDeleteResult> {
  const { data } = await apiClient.put<QuestionDeleteResult>(`/moderator/question-bank/${id}/archive`);
  return data;
}

export const SKILL_LABEL: Record<QuestionSkill, string> = {
  VOCABULARY: "Từ vựng",
  KANJI: "Kanji",
  GRAMMAR: "Ngữ pháp",
};

export const FORMAT_LABEL: Record<QuestionFormat, string> = {
  MCQ: "Trắc nghiệm",
  FILL_IN: "Điền đáp án",
  MATCHING: "Nối nghĩa",
};

export const LEVEL_LABEL: Record<QuestionLevel, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

export const TEST_KIND_LABEL: Record<TestKind, string> = {
  MINI_TEST: "Mini test",
  LESSON_TEST: "Test bài học",
  CHAPTER_TEST: "Test chương",
};

export const STATE_LABEL: Record<QuestionState, string> = {
  ACTIVE: "Đang dùng",
  ARCHIVED: "Lưu trữ",
};

// ===== Chọn khóa học / chương / bài học (bộ lọc và biểu mẫu) =====
// Chọn được chương, bài học mà không bắt buộc chọn khóa học trước; chọn cấp dưới sẽ tự điền cấp trên.

type Chapter = QuestionBankTargets["chapters"][number];
type Lesson = QuestionBankTargets["lessons"][number];

export function chapterLabel(targets: QuestionBankTargets | null, chapter: Chapter, withCourse: boolean): string {
  const title = /^chương\s/i.test(chapter.title) ? chapter.title : `Chương ${chapter.chapterNo}: ${chapter.title}`;
  if (!withCourse) return title;
  const course = targets?.courses.find((c) => c.id === chapter.courseId);
  return course ? `${course.name} · ${title}` : title;
}

export function lessonLabel(targets: QuestionBankTargets | null, lesson: Lesson, withChapter: boolean): string {
  const title = /^bài\s/i.test(lesson.title) ? lesson.title : `Bài ${lesson.lessonNo}: ${lesson.title}`;
  if (!withChapter) return title;
  const chapter = targets?.chapters.find((c) => c.id === lesson.chapterId);
  return chapter ? `${chapterLabel(targets, chapter, true)} · ${title}` : title;
}

/** Chương thuộc khóa học đã chọn; chưa chọn khóa học → mọi chương. */
export function chaptersOf(targets: QuestionBankTargets | null, courseId: number | ""): Chapter[] {
  const all = targets?.chapters ?? [];
  return courseId === "" ? all : all.filter((c) => c.courseId === courseId);
}

/** Bài học theo chương (hoặc khóa học nếu chưa chọn chương) và kỹ năng. */
export function lessonsOf(
  targets: QuestionBankTargets | null,
  courseId: number | "",
  chapterId: number | "",
  skill: QuestionSkill | "",
): Lesson[] {
  const chapterIds = new Set(chaptersOf(targets, courseId).map((c) => c.id));
  return (targets?.lessons ?? []).filter(
    (l) => (chapterId !== "" ? l.chapterId === chapterId : chapterIds.has(l.chapterId)) && (!skill || l.skillType === skill),
  );
}

/** Khóa học, chương chứa một bài học / chương (để tự điền khi chọn cấp dưới). */
export function courseOfChapter(targets: QuestionBankTargets | null, chapterId: number | ""): number | "" {
  if (chapterId === "") return "";
  return targets?.chapters.find((c) => c.id === chapterId)?.courseId ?? "";
}

export function chapterOfLesson(targets: QuestionBankTargets | null, lessonId: number | ""): number | "" {
  if (lessonId === "") return "";
  return targets?.lessons.find((l) => l.id === lessonId)?.chapterId ?? "";
}
