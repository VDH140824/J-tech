import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCourses } from "../../api/courseApi";
import { getCourseTestResults, type TestResult } from "../../api/studentHomeApi";
import { useAuthStore } from "../../store/authStore";
import "./TestResultsPage.css";

/**
 * Kết quả bài kiểm tra của học viên: mọi Mini test và Test chương đã xuất bản của một khóa học,
 * kèm số lần làm, điểm cao nhất và trạng thái (chưa làm / chưa đạt / đã đạt).
 */

type TypeFilter = "ALL" | "MINI_TEST" | "CHAPTER_TEST";
type StatusFilter = "ALL" | "TODO" | "FAILED" | "PASSED";

const SKILL_NAME: Record<string, string> = {
  VOCABULARY: "Từ vựng",
  KANJI: "Chữ Hán",
  GRAMMAR: "Ngữ pháp",
  ALL: "Tổng hợp",
};

const TYPE_TABS: ReadonlyArray<{ value: TypeFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "MINI_TEST", label: "Mini test" },
  { value: "CHAPTER_TEST", label: "Test chương" },
];

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "Mọi trạng thái" },
  { value: "TODO", label: "Chưa làm" },
  { value: "FAILED", label: "Chưa đạt" },
  { value: "PASSED", label: "Đã đạt" },
];

function statusOf(t: TestResult): Exclude<StatusFilter, "ALL"> {
  if (t.passed) return "PASSED";
  return t.attempts > 0 ? "FAILED" : "TODO";
}

const STATUS_LABEL = { TODO: "Chưa làm", FAILED: "Chưa đạt", PASSED: "Đã đạt" } as const;

/** Đường dẫn mở đúng màn làm bài trong trang chương (theo query mà ChapterPage đang đọc). */
function testLink(courseId: number, t: TestResult) {
  const base = `/courses/${courseId}/chapters/${t.chapterId}`;
  if (t.testType === "CHAPTER_TEST") return `/courses/${courseId}#chapter-${t.chapterId}`;
  if (t.lessonId === null) {
    if (t.skill === "KANJI") return `${base}?skill=KANJI&kanjiChapterView=test`;
    if (t.skill === "VOCABULARY") return `${base}?skill=VOCABULARY&vocabChapterView=test`;
    return base;
  }
  if (t.lessonSkill === "GRAMMAR") return `${base}?skill=GRAMMAR&lessonNo=${t.lessonNo}&grammarView=test`;
  return `${base}?skill=${encodeURIComponent(t.lessonSkill ?? t.skill)}&lessonId=${t.lessonId}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Summary({ label, list, tone }: { label: string; list: TestResult[]; tone: string }) {
  const done = list.filter((t) => t.passed).length;
  const percent = list.length ? Math.round((done / list.length) * 100) : 0;
  return (
    <article className={`tr-stat tr-tone--${tone}`}>
      <span className="tr-stat-label">{label}</span>
      <strong>
        {done}
        <small> / {list.length} bài</small>
      </strong>
      <div className="tr-bar" role="progressbar" aria-label={`${label} đã đạt`} aria-valuenow={percent}
        aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </article>
  );
}

export function TestResultsPage() {
  const user = useAuthStore((state) => state.user);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const courses = useQuery({ queryKey: ["home-courses"], queryFn: getCourses });
  const courseId = Number(params.get("courseId")) || courses.data?.[0]?.id || 0;
  const course = courses.data?.find((c) => c.id === courseId);

  const results = useQuery({
    queryKey: ["test-results", user?.id, courseId],
    queryFn: ({ signal }) => getCourseTestResults(courseId, signal),
    enabled: courseId > 0,
  });

  const all = results.data ?? [];
  const totalAttempts = all.reduce((sum, t) => sum + t.attempts, 0);

  const groups = useMemo(() => {
    const filtered = (results.data ?? []).filter(
      (t) =>
        (typeFilter === "ALL" || t.testType === typeFilter) &&
        (statusFilter === "ALL" || statusOf(t) === statusFilter),
    );
    const map = new Map<number, { chapterNo: number; chapterTitle: string; chapterId: number; items: TestResult[] }>();
    filtered.forEach((t) => {
      const g = map.get(t.chapterId) ?? { chapterNo: t.chapterNo, chapterTitle: t.chapterTitle, chapterId: t.chapterId, items: [] };
      g.items.push(t);
      map.set(t.chapterId, g);
    });
    return [...map.values()];
  }, [results.data, typeFilter, statusFilter]);

  return (
    <div className="tr-page">
      <button type="button" className="tr-back"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}>
        ← Quay lại
      </button>

      <header className="tr-head">
        <div>
          <span className="tr-eyebrow">TIẾN ĐỘ HỌC TẬP</span>
          <h1>Kết quả bài kiểm tra</h1>
          <p className="tr-muted">Mini test và Test chương của khóa học. Số "đã đạt" tính theo lần làm tốt nhất.</p>
        </div>
        {!!courses.data?.length && (
          <label className="tr-select">
            Chọn khóa học
            <select value={courseId} onChange={(e) => setParams({ courseId: e.target.value })}>
              {courses.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {courses.isPending || (courseId > 0 && results.isPending) ? (
        <p role="status" className="tr-state">
          Đang tải kết quả…
        </p>
      ) : courses.isError || results.isError ? (
        <p role="alert" className="tr-state">
          Chưa tải được kết quả bài kiểm tra.{" "}
          <button type="button" onClick={() => void (courses.isError ? courses.refetch() : results.refetch())}>
            Thử lại
          </button>
        </p>
      ) : !course ? (
        <p className="tr-state">Chưa có khóa học được xuất bản.</p>
      ) : (
        <>
          <section className="tr-stats" aria-label="Tổng quan">
            <Summary label="Mini test" list={all.filter((t) => t.testType === "MINI_TEST")} tone="violet" />
            <Summary label="Test chương" list={all.filter((t) => t.testType === "CHAPTER_TEST")} tone="slate" />
            <article className="tr-stat tr-tone--teal">
              <span className="tr-stat-label">Lượt làm bài</span>
              <strong>
                {totalAttempts}
                <small> lượt</small>
              </strong>
              <span className="tr-muted tr-small">Tính các lần đã nộp bài</span>
            </article>
          </section>

          <div className="tr-filters">
            <div className="tr-tabs" role="tablist" aria-label="Loại bài">
              {TYPE_TABS.map((tab) => (
                <button key={tab.value} type="button" role="tab" aria-selected={typeFilter === tab.value}
                  className={typeFilter === tab.value ? "is-active" : ""} onClick={() => setTypeFilter(tab.value)}>
                  {tab.label}
                </button>
              ))}
            </div>
            <label className="tr-select tr-select--inline">
              <span className="tr-sr">Trạng thái</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
                {STATUS_TABS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!all.length ? (
            <p className="tr-state">Khóa học này chưa có Mini test hoặc Test chương.</p>
          ) : !groups.length ? (
            <p className="tr-state">Không có bài nào khớp bộ lọc.</p>
          ) : (
            groups.map((g) => (
              <section key={g.chapterId} className="tr-chapter" aria-labelledby={`tr-ch-${g.chapterId}`}>
                <h2 id={`tr-ch-${g.chapterId}`}>
                  <span className="tr-chapter-no">{String(g.chapterNo).padStart(2, "0")}</span>
                  Chương {g.chapterNo}: {g.chapterTitle}
                </h2>
                <ul className="tr-list">
                  {g.items.map((t) => {
                    const status = statusOf(t);
                    return (
                      <li key={t.id} className="tr-row">
                        <div className="tr-row-main">
                          <div className="tr-badges">
                            <span className={`tr-type ${t.testType === "MINI_TEST" ? "is-mini" : "is-chapter"}`}>
                              {t.testType === "MINI_TEST" ? "Mini test" : "Test chương"}
                            </span>
                            <span className="tr-muted tr-small">
                              {SKILL_NAME[t.lessonSkill ?? t.skill] ?? t.skill}
                              {t.lessonNo !== null ? ` · Bài ${t.lessonNo}` : t.testType === "MINI_TEST" ? " · Theo chương" : ""}
                              {` · ${t.durationMinutes} phút`}
                            </span>
                          </div>
                          <strong className="tr-title">{t.title}</strong>
                        </div>
                        <dl className="tr-meta">
                          <div>
                            <dt>Điểm cao nhất</dt>
                            <dd>
                              {t.bestScore === null ? "—" : Math.round(Number(t.bestScore))}
                              <small> / 100 · đạt từ {Math.round(Number(t.passingScore))}</small>
                            </dd>
                          </div>
                          <div>
                            <dt>Số lần làm</dt>
                            <dd>{t.attempts}</dd>
                          </div>
                          <div>
                            <dt>Lần gần nhất</dt>
                            <dd>{formatDate(t.lastSubmittedAt)}</dd>
                          </div>
                        </dl>
                        <span className={`tr-status tr-status--${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
                        <Link className="tr-action" to={testLink(courseId, t)}>
                          {t.testType === "CHAPTER_TEST" ? "Mở chương" : t.attempts > 0 ? "Làm lại" : "Làm bài"} →
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
