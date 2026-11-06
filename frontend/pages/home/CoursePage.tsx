import { useAuthStore } from "../../store/authStore";
import { checkIsModerator } from "../../utils/auth";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  getStudentChapters,
  type StudentChapterList,
  type StudentChapter,
  type StudentLesson,
} from "../../api/studentChapterApi";
import "./CoursePage.css";
const skills: Record<string, string> = {
  KANJI: "Chữ Hán",
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  LISTENING: "Nghe hiểu",
  READING: "Đọc hiểu",
};
function Progress({ lessons }: { lessons: StudentLesson[] }) {
  const done = lessons.filter((l) => l.completed).length;
  return (
    <div className="chapter-progress">
      <div>
        <span>
          {done}/{lessons.length} phần học hoàn thành
        </span>
        <strong>{lessons.length ? Math.round((done / lessons.length) * 100) : 0}%</strong>
      </div>
      <progress
        aria-label="Tiến độ hoàn thành"
        value={done}
        max={lessons.length || 1}
      />
    </div>
  );
}
function ChapterCard({
  chapter,
  first,
  courseId,
}: {
  chapter: StudentChapter;
  first: boolean;
  courseId: number;
}) {
  const sum = (field: "videoCount" | "exerciseCount" | "testCount") =>
    chapter.lessons.reduce((n, l) => n + l[field], 0);
  const groups = new Map<number, StudentLesson[]>();
  chapter.lessons.forEach((l) => groups.set(l.lessonNo, [...(groups.get(l.lessonNo) ?? []), l]));
  return (
    <details
      className="student-chapter-card"
      open={first}
    >
      <summary className="chapter-heading">
        <span
          className="chapter-number"
          aria-hidden="true"
        >
          {String(chapter.chapterNo).padStart(2, "0")}
        </span>
        <div className="chapter-heading-content">
          <h2>
            Chương {chapter.chapterNo}: {chapter.title}
          </h2>
          <p>
            {sum("videoCount")} video · {sum("exerciseCount")} bài tập ·{" "}
            {chapter.testCount + sum("testCount")} bài kiểm tra
          </p>
          <Progress lessons={chapter.lessons} />
        </div>
        <span aria-hidden="true">⌄</span>
      </summary>
      <div className="chapter-body">
        {chapter.description && <p>{chapter.description}</p>}
        {!chapter.lessons.length && <p>Chưa có bài học được xuất bản trong chương này.</p>}
        {Array.from(groups, ([number, lessons]) => (
          <details
            className="chapter-lesson"
            key={number}
            open
          >
            <summary>
              <strong>Bài {number}</strong>
              <span>
                {lessons.filter((l) => l.completed).length}/{lessons.length} hoàn thành
              </span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <ul>
              {lessons.map((l) => (
                <li key={l.id}>
                  <span
                    className="lesson-icon"
                    aria-hidden="true"
                  >
                    {l.completed ? "✓" : "▷"}
                  </span>
                  <div className="lesson-content">
                    <h3>
                      <Link
                        to={`/courses/${courseId}/chapters/${chapter.id}?skill=${encodeURIComponent(l.skillType)}&lessonId=${l.id}`}
                      >
                        {skills[l.skillType] ?? l.skillType}
                      </Link>
                    </h3>
                    <p>{l.title}</p>
                    <small>
                      {l.itemCount} nội dung · {l.videoCount} video ·{" "}
                      {Math.ceil(l.durationSeconds / 60)} phút video · {l.exerciseCount} bài tập ·{" "}
                      {l.testCount} bài kiểm tra
                    </small>
                  </div>
                  <span className={`lesson-status ${l.completed ? "completed" : ""}`}>
                    {l.completed ? "Hoàn thành" : "Chưa hoàn thành"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </details>
  );
}
export function CoursePage() {
  const { courseId } = useParams();
  const user = useAuthStore((state) => state.user);
  const isModerator = checkIsModerator(user);
  const [course, setCourse] = useState<StudentChapterList>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setCourse(undefined);
    setError("");
    const id = Number(courseId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError("Khóa học không hợp lệ.");
      return;
    }
    if (isModerator) return;
    getStudentChapters(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCourse(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err.response?.status === 404
              ? "Không tìm thấy khóa học hoặc khóa học chưa được xuất bản."
              : err.response?.status === 403
                ? "Trang này dành cho học viên."
                : "Không thể tải danh sách chương. Vui lòng thử lại.",
          );
      });
    return () => controller.abort();
  }, [courseId, attempt, isModerator]);
  if (isModerator && Number.isSafeInteger(Number(courseId)) && Number(courseId) > 0)
    return (
      <Navigate
        to={`/moderator/courses?courseId=${courseId}`}
        replace
      />
    );
  return (
    <main className="student-course-page">
      <Link
        className="chapter-back"
        to="/home"
      >
        ← Lộ trình học
      </Link>
      {error ? (
        <div
          className="chapter-state"
          role="alert"
        >
          <p>{error}</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Thử lại</button>
        </div>
      ) : !course ? (
        <div
          className="chapter-state"
          role="status"
        >
          Đang tải danh sách chương…
        </div>
      ) : (
        <>
          <header className="student-course-header">
            <span>LỘ TRÌNH HỌC TẬP</span>
            <h1>{course.name}</h1>
            <p>{course.description}</p>
          </header>
          <section
            className="course-progress-panel"
            aria-label="Tổng quan khóa học"
          >
            <div>
              <h2>Tiến độ khóa học</h2>
              <p>
                {course.chapters.length} chương ·{" "}
                {course.chapters.reduce((n, c) => n + c.lessons.length, 0)} phần học
              </p>
            </div>
            <Progress lessons={course.chapters.flatMap((c) => c.lessons)} />
          </section>
          <section aria-label="Danh sách chương">
            {!course.chapters.length ? (
              <div className="chapter-state">Khóa học chưa có chương được xuất bản.</div>
            ) : (
              course.chapters.map((chapter, i) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  courseId={Number(courseId)}
                  first={i === 0}
                />
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
