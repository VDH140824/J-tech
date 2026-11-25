import { useEffect, type ReactNode } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { getCourses } from "../../api/courseApi";
import { getStudentChapters, type StudentChapterList, type StudentLesson } from "../../api/studentChapterApi";
import { getStreakSummary } from "../../api/streakApi";
import { getEnrolledClasses } from "../../api/classApi";
import { getCoinBalance, getCourseTestStatuses, getLastLesson } from "../../api/studentHomeApi";
import { useAuthStore } from "../../store/authStore";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import "./StudentHomeDashboard.css";

/**
 * Trang chủ của học viên (thiết kế mới): Tiếp tục học, Khóa học,
 * Tiến độ khóa đang học, Chuỗi ngày học, Lớp học của tôi.
 * Tiến độ tính giống trang /progress: số "phần học" (lesson.completed) đã hoàn thành.
 */

const SKILLS: ReadonlyArray<{ type: string; name: string; color: string }> = [
  { type: "VOCABULARY", name: "Từ vựng", color: "#0F766E" },
  { type: "GRAMMAR", name: "Ngữ pháp", color: "#2563EB" },
  { type: "KANJI", name: "Chữ Hán", color: "#D97706" },
  { type: "LISTENING", name: "Nghe hiểu", color: "#0891B2" },
  { type: "READING", name: "Đọc hiểu", color: "#DB2777" },
];
const SKILL_NAME: Record<string, string> = Object.fromEntries(SKILLS.map((s) => [s.type, s.name]));
const WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ===== Biểu tượng (SVG nét, không dùng emoji) =====
const path: Record<string, ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path[name]}
    </svg>
  );
}

// ===== Tính tiến độ (giống LearningProgressPage) =====
type Section = { lesson: StudentLesson; chapterId: number; chapterNo: number };

/** Mỗi tài liệu Kanji là một phần học riêng, như trang khóa học. */
function sectionsOf(data: StudentChapterList | undefined): Section[] {
  return (data?.chapters ?? []).flatMap((chapter) =>
    chapter.lessons.flatMap((lesson) =>
      (lesson.skillType === "KANJI" ? parseLessonDocuments(lesson.documents).map(() => lesson) : [lesson]).map(
        (l) => ({ lesson: l, chapterId: chapter.id, chapterNo: chapter.chapterNo }),
      ),
    ),
  );
}
function count(items: Section[]) {
  const done = items.filter((s) => s.lesson.completed).length;
  return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
}

/** Đường dẫn mở một phần học — giống CoursePage. */
function lessonLink(courseId: number, s: Section) {
  const l = s.lesson;
  if (l.skillType === "LISTENING") return `/listening/${l.id}`;
  if (l.skillType === "READING") return `/ai-reading?lessonId=${l.id}`;
  const query =
    l.skillType === "VOCABULARY" && l.id > 0
      ? `&lessonId=${l.id}`
      : l.skillType === "GRAMMAR" || l.skillType === "VOCABULARY"
        ? `&lessonNo=${l.lessonNo}`
        : `&lessonId=${l.id}`;
  return `/courses/${courseId}/chapters/${s.chapterId}?skill=${encodeURIComponent(l.skillType)}${query}`;
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 11 ? "Chào buổi sáng" : hour < 14 ? "Chào buổi trưa" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

/** Các ngày trong tuần hiện tại (T2 → CN) theo định dạng yyyy-mm-dd của server. */
function weekDays(today: string) {
  const base = new Date(`${today}T00:00:00`);
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  return WEEK.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { label, iso };
  });
}

export function StudentHomeDashboard() {
  const user = useAuthStore((state) => state.user);
  const name = user?.displayName || user?.fullName || "bạn";

  const courses = useQuery({ queryKey: ["home-courses"], queryFn: getCourses });
  const progress = useQueries({
    queries: (courses.data ?? []).map((course) => ({
      queryKey: ["learning-progress", user?.id, course.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => getStudentChapters(course.id, signal),
    })),
  });
  const streak = useQuery({ queryKey: ["progress-streak", user?.id], queryFn: getStreakSummary });
  // Dùng chung cache với chip xu ở thanh trên cùng
  useQuery({ queryKey: ["home-coin-balance", user?.id], queryFn: getCoinBalance });
  const classes = useQuery({ queryKey: ["home-enrolled-classes", user?.id], queryFn: getEnrolledClasses });

  // Khóa đang học: khóa đã học một phần mà chưa xong; không có thì khóa đầu tiên còn bài chưa học.
  const courseStats = (courses.data ?? []).map((course, i) => {
    const sections = sectionsOf(progress[i]?.data);
    return { course, sections, ...count(sections), loading: progress[i]?.isLoading ?? true };
  });
  // Bài học người học hoạt động gần nhất → "Tiếp tục học" mở đúng bài đó.
  const lastLesson = useQuery({
    queryKey: ["home-last-lesson", user?.id],
    queryFn: ({ signal }) => getLastLesson(signal),
  });
  const lastStat = lastLesson.data
    ? courseStats.find((c) => c.course.id === lastLesson.data?.courseId)
    : undefined;
  const lastSection = lastStat?.sections.find((s) => s.lesson.id === lastLesson.data?.lessonId);
  // Chưa học gì (hoặc bài gần nhất không còn xuất bản): khóa đã học một phần mà chưa xong,
  // không có thì khóa đầu tiên còn bài chưa học; mở phần học đầu tiên chưa hoàn thành.
  const current = lastSection
    ? lastStat
    : (courseStats.find((c) => c.done > 0 && c.done < c.total) ??
      courseStats.find((c) => c.done < c.total) ??
      courseStats[0]);
  const next = lastSection ?? current?.sections.find((s) => !s.lesson.completed);
  const nextLesson = next?.lesson;

  // Mini test / Test chương của khóa đang học
  const tests = useQuery({
    queryKey: ["home-test-status", user?.id, current?.course.id],
    queryFn: ({ signal }) => getCourseTestStatuses(current!.course.id, signal),
    enabled: current !== undefined,
  });
  const testParts = (["MINI_TEST", "CHAPTER_TEST"] as const).map((type) => {
    const list = (tests.data ?? []).filter((t) => t.testType === type);
    const done = list.filter((t) => t.passed).length; // số bài đã đạt
    return {
      type,
      name: type === "MINI_TEST" ? "Mini test" : "Test chương",
      color: type === "MINI_TEST" ? "#7C3AED" : "#475569",
      done,
      total: list.length,
      percent: list.length ? Math.round((done / list.length) * 100) : 0,
    };
  });
  // Mini test của bài đang học (Kanji: Mini test theo chương)
  const lessonMiniTest = nextLesson
    ? tests.data?.find(
        (t) =>
          t.testType === "MINI_TEST" &&
          (t.lessonId === nextLesson.id ||
            (t.lessonId === null && t.chapterId === next?.chapterId && t.skill === nextLesson.skillType)),
      )
    : undefined;

  // Mục "Khóa học" ở thanh bên mở /home#khoa-hoc → cuộn tới khối Khóa học
  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#khoa-hoc" && !courses.isLoading)
      document.getElementById("khoa-hoc")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, courses.isLoading]);

  return (
    <div className="sh-page">
      <div className="sh-main">
        {/* Lời chào (chuỗi ngày và xu nằm ở thanh trên cùng) */}
        <div className="sh-greeting">
          <div>
            <h1>
              {greeting()}, {name}
            </h1>
            <p>
              {nextLesson && lastSection
                ? `Lần trước bạn học ${SKILL_NAME[nextLesson.skillType]?.toLowerCase() ?? "bài"} Bài ${nextLesson.lessonNo}, học tiếp nhé.`
                : nextLesson
                ? `Hôm nay học tiếp ${SKILL_NAME[nextLesson.skillType]?.toLowerCase() ?? "bài"} Bài ${nextLesson.lessonNo} nhé.`
                : "Chọn một khóa học để bắt đầu nhé."}
            </p>
          </div>
        </div>

        {/* Tiếp tục học */}
        <section className="sh-continue" aria-labelledby="sh-continue-title">
          {courses.isLoading || lastLesson.isLoading || current?.loading ? (
            <p role="status">Đang tải bài học…</p>
          ) : !current ? (
            <p>Chưa có khóa học nào được xuất bản.</p>
          ) : (
            <>
              <div className="sh-continue-text">
                <span className="sh-eyebrow">
                  {nextLesson ? "TIẾP TỤC HỌC" : "ĐÃ HOÀN THÀNH"} · {current.course.name.toUpperCase()}
                  {next ? ` · CHƯƠNG ${next.chapterNo}` : ""}
                </span>
                <h2 id="sh-continue-title">
                  {nextLesson ? nextLesson.title : `Bạn đã hoàn thành ${current.course.name}`}
                </h2>
                {nextLesson && (
                  <div className="sh-tags">
                    <span>{SKILL_NAME[nextLesson.skillType] ?? nextLesson.skillType}</span>
                    <span>
                      {nextLesson.itemCount} nội dung · {nextLesson.exerciseCount} bài tập
                    </span>
                    {lessonMiniTest && (
                      <span className={lessonMiniTest.passed ? "sh-tag-pass" : "sh-tag-test"}>
                        {lessonMiniTest.passed
                          ? "Mini test đã đạt"
                          : lessonMiniTest.attempted
                            ? "Mini test chưa đạt"
                            : "Mini test chưa làm"}
                      </span>
                    )}
                  </div>
                )}
                <div className="sh-continue-actions">
                  <Link className="sh-btn-light" to={next ? lessonLink(current.course.id, next) : `/courses/${current.course.id}`}>
                    {nextLesson ? "Học tiếp" : "Ôn tập khóa học"} <Icon name="arrow" size={18} />
                  </Link>
                  {lessonMiniTest && next && !lessonMiniTest.passed ? (
                    <Link className="sh-btn-ghost" to={lessonLink(current.course.id, next)}>
                      Làm Mini test
                    </Link>
                  ) : (
                    <Link className="sh-btn-ghost" to={`/courses/${current.course.id}${next ? `#chapter-${next.chapterId}` : ""}`}>
                      Xem khóa học
                    </Link>
                  )}
                </div>
              </div>
              <div
                className="sh-donut"
                role="img"
                aria-label={`Hoàn thành ${current.course.name}: ${current.percent}%`}
                style={{ background: `conic-gradient(#5EEAD4 0 ${current.percent}%, rgba(255,255,255,.15) ${current.percent}% 100%)` }}
              >
                <div>
                  <strong>{current.percent}%</strong>
                  <small>{current.course.name}</small>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Khóa học */}
        <section className="sh-section" id="khoa-hoc" aria-labelledby="sh-courses-title">
          <div className="sh-section-head">
            <h2 id="sh-courses-title">Khóa học</h2>
            <Link to="/progress">Xem tiến độ</Link>
          </div>
          {courses.isError ? (
            <p role="alert" className="sh-muted">
              Không tải được khóa học.{" "}
              <button type="button" className="sh-link-btn" onClick={() => void courses.refetch()}>
                Thử lại
              </button>
            </p>
          ) : (
            <div className="sh-courses">
              {courseStats.map(({ course, done, total, percent }, i) => (
                <Link key={course.id} to={`/courses/${course.id}`} className="sh-card sh-course">
                  <div className="sh-course-head">
                    <span className={`sh-course-mark sh-mark-${i % 4}`} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{course.name}</strong>
                      <small>
                        {course.chapterCount} chương · {total} phần học
                      </small>
                    </div>
                    <span className={`sh-badge ${done === 0 ? "sh-badge--idle" : ""}`}>
                      {done === 0 ? "Chưa bắt đầu" : done === total ? "Hoàn thành" : "Đang học"}
                    </span>
                  </div>
                  <div>
                    <div className="sh-bar-label">
                      <span>
                        {done}/{total} phần học
                      </span>
                      <strong>{percent}%</strong>
                    </div>
                    <div className="sh-bar">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="sh-aside" aria-label="Tiến độ và hoạt động">
        {/* Tiến độ khóa đang học theo kỹ năng */}
        <section className="sh-card sh-panel" aria-labelledby="sh-progress-title">
          <div className="sh-section-head">
            <h2 id="sh-progress-title">Tiến độ {current?.course.name ?? "khóa học"}</h2>
            <Link to={current ? `/progress?courseId=${current.course.id}` : "/progress"}>Xem chi tiết</Link>
          </div>
          {SKILLS.map((skill) => {
            const items = (current?.sections ?? []).filter((s) => s.lesson.skillType === skill.type);
            const c = count(items);
            return (
              <div key={skill.type} className="sh-skill">
                <div className="sh-bar-label">
                  <span>{skill.name}</span>
                  <span className="sh-muted">{c.total ? `${c.done} / ${c.total}` : "Chưa có"}</span>
                </div>
                <div className="sh-bar sh-bar--thin">
                  <span style={{ width: `${c.percent}%`, background: skill.color }} />
                </div>
              </div>
            );
          })}
          {testParts.map((part) => (
            <div key={part.type} className="sh-skill">
              <div className="sh-bar-label">
                <span>{part.name}</span>
                <span className="sh-muted">{part.total ? `${part.done} / ${part.total} bài` : "Chưa có"}</span>
              </div>
              <div className="sh-bar sh-bar--thin">
                <span style={{ width: `${part.percent}%`, background: part.color }} />
              </div>
            </div>
          ))}
          <Link className="sh-panel-link" to={current ? `/progress/tests?courseId=${current.course.id}` : "/progress/tests"}>
            Xem kết quả bài kiểm tra →
          </Link>
        </section>

        {/* Chuỗi ngày học trong tuần */}
        <section className="sh-card sh-panel" aria-labelledby="sh-streak-title">
          <div className="sh-section-head">
            <h2 id="sh-streak-title">Chuỗi ngày học</h2>
            <strong className="sh-streak-count">{streak.data?.currentStreak ?? 0} ngày</strong>
          </div>
          {streak.data && (
            <ol className="sh-week" aria-label="Tuần này">
              {weekDays(streak.data.today).map((d) => {
                const learned = streak.data.learningDays.includes(d.iso);
                const isToday = d.iso === streak.data.today;
                return (
                  <li key={d.iso} className={isToday ? "is-today" : ""}>
                    <span className={learned ? "is-learned" : isToday ? "is-pending" : ""} />
                    {d.label}
                  </li>
                );
              })}
            </ol>
          )}
          <p className="sh-muted sh-small">
            {streak.data?.learningDays.includes(streak.data.today)
              ? "Hôm nay bạn đã học rồi."
              : "Học một nội dung hôm nay để giữ chuỗi."}
            {streak.data?.nextMilestone && ` Mốc thưởng tiếp theo: ${streak.data.nextMilestone.targetDays} ngày.`}
          </p>
        </section>

        {/* Lớp học của tôi */}
        <section className="sh-card sh-panel" aria-labelledby="sh-class-title">
          <div className="sh-section-head">
            <h2 id="sh-class-title">Lớp học của tôi</h2>
            <Link to="/classes">Xem tất cả</Link>
          </div>
          {classes.isLoading ? (
            <p className="sh-muted sh-small" role="status">
              Đang tải lớp học…
            </p>
          ) : !classes.data?.length ? (
            <p className="sh-muted sh-small">Bạn chưa tham gia lớp học nào.</p>
          ) : (
            classes.data.slice(0, 3).map((c) => (
              <Link key={c.id} to={`/classes/${c.id}/posts`} className="sh-class">
                <span className="sh-class-mark">{c.code.slice(0, 2).toUpperCase()}</span>
                <span>
                  <strong>{c.code}</strong>
                  <small>
                    {c.description || "Lớp học"} · {c.studentCount} học viên
                  </small>
                </span>
              </Link>
            ))
          )}
        </section>
      </aside>
    </div>
  );
}
