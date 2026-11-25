import { apiClient } from "../services/api";

/** Số dư xu hiện tại (dùng trang lịch sử xu, chỉ lấy 1 dòng). */
export async function getCoinBalance() {
  return (await apiClient.get<{ balance: number }>("/coins", { params: { page: 0, size: 1 } })).data.balance;
}

/** Trạng thái Mini test / Test chương đã xuất bản của một khóa học (GET /api/student/progress/tests). */
export interface TestStatus {
  id: number;
  testType: "MINI_TEST" | "CHAPTER_TEST";
  lessonId: number | null;
  chapterId: number;
  skill: string;
  attempted: boolean;
  passed: boolean;
}

export async function getCourseTestStatuses(courseId: number, signal?: AbortSignal) {
  return (await apiClient.get<TestStatus[]>("/student/progress/tests", { params: { courseId }, signal })).data;
}

/** Một bài Mini test / Test chương kèm kết quả của học viên (GET /api/student/progress/tests/results). */
export interface TestResult {
  id: number;
  testType: "MINI_TEST" | "CHAPTER_TEST";
  skill: string;
  title: string;
  passingScore: number;
  durationMinutes: number;
  chapterId: number;
  chapterNo: number;
  chapterTitle: string;
  lessonId: number | null;
  lessonNo: number | null;
  lessonTitle: string | null;
  lessonSkill: string | null;
  attempts: number;
  bestScore: number | null;
  passed: boolean;
  lastSubmittedAt: string | null;
}

export async function getCourseTestResults(courseId: number, signal?: AbortSignal) {
  return (await apiClient.get<TestResult[]>("/student/progress/tests/results", { params: { courseId }, signal })).data;
}

/** Bài học có hoạt động gần nhất của học viên (GET /api/student/progress/last-lesson); null nếu chưa học gì. */
export interface LastLesson {
  lessonId: number;
  chapterId: number;
  courseId: number;
  at: string;
}

export async function getLastLesson(signal?: AbortSignal): Promise<LastLesson | null> {
  const data = (await apiClient.get<LastLesson | "">("/student/progress/last-lesson", { signal })).data;
  return data ? data : null;
}

/** Ghi nhận học viên vừa mở một bài học (để Trang chủ biết "lần học cuối"). Không ảnh hưởng tiến độ hoàn thành. */
export interface ViewedLesson {
  lessonId?: number;
  chapterId?: number;
  skill?: string;
  lessonNo?: number;
}

export async function recordLessonViewed(body: ViewedLesson) {
  await apiClient.post("/student/progress/viewed", body);
}
