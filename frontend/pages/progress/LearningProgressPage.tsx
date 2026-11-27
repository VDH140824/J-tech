import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { getCourses } from "../../api/courseApi";
import { getStudentChapters, type StudentLesson } from "../../api/studentChapterApi";
import { getStreakSummary } from "../../api/streakApi";
import { useAuthStore } from "../../store/authStore";
import { formatChapterLabel } from "../../utils/chapterLabel";
import { parseLessonDocuments } from "../../utils/lessonDocuments";
import "./LearningProgressPage.css";

const skills = [
  { type: "VOCABULARY", name: "Từ vựng", icon: "あ", tone: "rose" },
  { type: "KANJI", name: "Kanji", icon: "漢", tone: "violet" },
  { type: "GRAMMAR", name: "Ngữ pháp", icon: "文", tone: "teal" },
  { type: "LISTENING", name: "Nghe hiểu", icon: "♫", tone: "amber" },
  { type: "READING", name: "Đọc hiểu", icon: "読", tone: "blue" },
];

// Match CoursePage: each Kanji document is one displayed learning section.
function sections(lessons: StudentLesson[]) {
  return lessons.flatMap(lesson => lesson.skillType === "KANJI"
    ? parseLessonDocuments(lesson.documents).map(() => lesson)
    : [lesson]);
}

function totals(lessons: StudentLesson[]) {
  const done = lessons.filter(lesson => lesson.completed).length;
  return { done, total: lessons.length, percent: lessons.length ? Math.round(done / lessons.length * 100) : 0 };
}

function ProgressBar({ lessons, label }: { lessons: StudentLesson[]; label: string }) {
  const { done, total, percent } = totals(lessons);
  return <div className="lp-study-progress">
    <progress aria-label={label} value={done} max={total || 1} />
    <div><span>{total ? <><b>{done}/{total}</b> phần học hoàn thành</> : "Chưa có phần học"}</span><strong>{percent}%</strong></div>
  </div>;
}

export function LearningProgressPage() {
  const user = useAuthStore(state => state.user);
  const [params, setParams] = useSearchParams();
  const courses = useQuery({ queryKey: ["progress-courses", user?.id], queryFn: getCourses });
  const selected = courses.data?.find(course => String(course.id) === params.get("courseId")) ?? courses.data?.[0];
  const courseId = selected?.id;
  const course = useQuery({
    queryKey: ["learning-progress", user?.id, courseId],
    queryFn: ({ signal }) => getStudentChapters(courseId!, signal),
    enabled: courseId !== undefined,
  });
  const streak = useQuery({ queryKey: ["progress-streak", user?.id], queryFn: getStreakSummary });
  const chapters = course.data?.chapters ?? [];
  const lessons = sections(chapters.flatMap(chapter => chapter.lessons));
  const summary = totals(lessons);
  const nextChapter = chapters.find(chapter => sections(chapter.lessons).some(lesson => !lesson.completed));
  const completedChapters = chapters.filter(chapter => {
    const items = sections(chapter.lessons);
    return items.length > 0 && items.every(lesson => lesson.completed);
  }).length;
  const name = user?.displayName || user?.fullName;
  return <main className="learning-progress-page">
    <header className="lp-study-header">
      <div><span className="lp-study-eyebrow">HÀNH TRÌNH CỦA BẠN</span><h1>Tiến độ học tập</h1><p>{name ? `Chào ${name}! ` : ""}Mỗi phần học hoàn thành là một bước tiến mới.</p></div>
      <Link className="lp-study-outline" to="/home">Khám phá khóa học ↗</Link>
    </header>

    <section className="lp-study-streak" aria-label="Chuỗi ngày học toàn bộ khóa học">
      <span className="lp-study-icon lp-study-icon--amber" aria-hidden="true">🔥</span>
      <div><h2>Giữ nhịp học mỗi ngày</h2>{streak.isPending ? <p role="status">Đang tải chuỗi ngày học…</p> : streak.isError ? <p role="alert">Chưa tải được chuỗi ngày học. <button type="button" onClick={() => void streak.refetch()}>Thử lại</button></p> : <p><strong>{streak.data.currentStreak} ngày</strong> liên tiếp · Kỷ lục {streak.data.longestStreak} ngày <span className="lp-study-streak-note">· Tính trên toàn bộ hoạt động học</span></p>}</div>
      <Link to="/streak">Xem chuỗi ngày →</Link>
    </section>

    <div className="lp-study-course-picker"><div><h2>Khóa học của bạn</h2><p>Theo dõi tiến độ theo nội dung đã xuất bản.</p></div>{!!courses.data?.length && <label>Chọn khóa học<select value={courseId} onChange={event => setParams({ courseId: event.target.value })}>{courses.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}</div>

    {courses.isPending ? <div className="lp-study-state" role="status">Đang tải khóa học…</div>
      : courses.isError ? <div className="lp-study-state" role="alert"><p>Không thể tải danh sách khóa học.</p><button type="button" onClick={() => void courses.refetch()}>Thử lại</button></div>
      : !selected ? <div className="lp-study-state"><h2>Chưa có khóa học được xuất bản</h2><p>Hãy quay lại khi nội dung học sẵn sàng nhé.</p></div>
      : course.isPending ? <div className="lp-study-state" role="status">Đang tải tiến độ khóa học…</div>
      : course.isError ? <div className="lp-study-state" role="alert"><p>Không thể tải tiến độ khóa học. Khóa học có thể không còn được xuất bản.</p><button type="button" onClick={() => void course.refetch()}>Thử lại</button></div>
      : <>
        <section className="lp-study-overview" aria-label="Tổng quan tiến độ khóa học">
          <article className="lp-study-feature"><span className="lp-study-eyebrow">KHÓA HỌC ĐANG THEO DÕI</span><h2>{course.data.name}</h2><p>{course.data.description || "Từng bước chinh phục tiếng Nhật cùng J-Tech."}</p><ProgressBar lessons={lessons} label="Tiến độ toàn khóa học" /><Link className="lp-study-primary" to={`/courses/${courseId}${nextChapter ? `#chapter-${nextChapter.id}` : ""}`}>{nextChapter ? "Tiếp tục học" : summary.total && summary.done === summary.total ? "Ôn tập khóa học" : "Xem khóa học"} →</Link></article>
          <article className="lp-study-stat"><span className="lp-study-icon lp-study-icon--teal" aria-hidden="true">✓</span><strong>{summary.done}<small> / {summary.total}</small></strong><h3>Phần học hoàn thành</h3><p>Tiến độ được ghi nhận từ các phần học trong khóa.</p></article>
          <article className="lp-study-stat"><span className="lp-study-icon lp-study-icon--violet" aria-hidden="true">▤</span><strong>{completedChapters}<small> / {chapters.length}</small></strong><h3>Chương hoàn thành</h3><p>Hoàn thành tất cả phần học để hoàn tất một chương.</p></article>
        </section>

        <section aria-labelledby="lp-study-skills-title"><div className="lp-study-section-title"><h2 id="lp-study-skills-title">Nội dung học tập</h2><span>Tiến độ theo kỹ năng</span></div><div className="lp-study-skills">{skills.map(skill => {
          const items = lessons.filter(lesson => lesson.skillType === skill.type);
          const firstChapter = chapters.find(chapter => sections(chapter.lessons).some(lesson => lesson.skillType === skill.type && !lesson.completed)) ?? chapters.find(chapter => sections(chapter.lessons).some(lesson => lesson.skillType === skill.type));
          return <article className={`lp-study-skill lp-study-tone--${skill.tone}`} key={skill.type}><div className="lp-study-skill-heading"><span className={`lp-study-icon lp-study-icon--${skill.tone}`} aria-hidden="true">{skill.icon}</span><h3>{skill.name}</h3></div><ProgressBar lessons={items} label={`Tiến độ ${skill.name}`} />{firstChapter ? <Link to={`/courses/${courseId}#chapter-${firstChapter.id}`}>Mở chương học →</Link> : <span className="lp-study-muted">Chưa có nội dung</span>}</article>;
        })}</div><p className="lp-study-footnote">Tỷ lệ được tính theo phần học hoàn thành, cùng cách hiển thị tại trang khóa học. Số liệu này không đại diện cho số câu trả lời đúng hoặc số từ đã nhớ.</p></section>

        <section aria-labelledby="lp-study-chapters-title"><div className="lp-study-section-title"><h2 id="lp-study-chapters-title">Lộ trình từng chương</h2><span>{chapters.length} chương</span></div>{!chapters.length ? <div className="lp-study-state">Khóa học chưa có chương được xuất bản.</div> : <div className="lp-study-chapters">{chapters.map(chapter => {
          const items = sections(chapter.lessons);
          const result = totals(items);
          return <article className="lp-study-chapter" key={chapter.id}><span className="lp-study-chapter-number">{String(chapter.chapterNo).padStart(2, "0")}</span><div className="lp-study-chapter-content"><h3>{formatChapterLabel(chapter.chapterNo, chapter.title)}</h3><ProgressBar lessons={items} label={`Tiến độ chương ${chapter.chapterNo}`} /></div><Link className="lp-study-outline" to={`/courses/${courseId}#chapter-${chapter.id}`}>{result.total && result.done === result.total ? "Ôn tập" : "Mở chương"} →</Link></article>;
        })}</div>}</section>
      </>}
  </main>;
}
