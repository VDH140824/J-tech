import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCourses, getCourse, type CourseSummary, type ChapterSummary } from "../../../api/courseApi";
import { getLessonsByChapter, type LessonSummary } from "../../../api/lessonApi";
import { ModeratorKanjiPage } from "./ModeratorKanjiPage";

export function ModeratorKanjiManagementPage() {
  const [params, setParams] = useSearchParams();
  const courseId = Number(params.get("courseId")) || 0;
  const chapterId = Number(params.get("chapterId")) || 0;
  const lessonId = Number(params.get("lessonId")) || 0;
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setChapters([]); setLessons([]);
    async function load() {
      try {
        const allCourses = await getCourses();
        if (!active) return;
        setCourses(allCourses);
        if (!courseId) return;
        if (!allCourses.some(c => c.id === courseId)) throw new Error("Không tìm thấy môn học đã chọn.");
        const course = await getCourse(courseId);
        if (!active) return;
        setChapters(course.chapters);
        if (!chapterId) return;
        if (!course.chapters.some(c => c.id === chapterId)) throw new Error("Không tìm thấy chương đã chọn.");
        const items = await getLessonsByChapter(chapterId, "KANJI");
        if (!active) return;
        setLessons(items);
        if (lessonId && !items.some(l => l.id === lessonId)) throw new Error("Không tìm thấy bài học Kanji đã chọn.");
      } catch (e) {
        if (active) setError(e instanceof Error && !('isAxiosError' in e) ? e.message : "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [courseId, chapterId, lessonId, retry]);
  const lesson = lessons.find(l => l.id === lessonId);
  const choose = (course: number, chapter = 0, item = 0) => {
    const next = new URLSearchParams();
    if (course) next.set("courseId", String(course));
    if (chapter) next.set("chapterId", String(chapter));
    if (item) next.set("lessonId", String(item));
    setParams(next);
  };
  if (lesson && !loading && !error) return <ModeratorKanjiPage key={lesson.id} lesson={lesson} onBack={() => choose(courseId, chapterId)} />;
  return <div className="admin-page-container kanji-page">
    <div className="admin-page-header"><div><h2 className="admin-main-title">Quản lý Kanji</h2>
      <p className="admin-main-subtitle">Chọn môn học, chương và bài học để thêm, sửa hoặc lưu trữ Kanji.</p></div></div>
    <div className="mod-section-toolbar" style={{ flexWrap: "wrap", gap: 16 }}>
      <label>Môn học <select aria-label="Môn học" value={courseId} onChange={e => choose(Number(e.target.value))}>
        <option value={0}>Chọn môn học</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
      <label>Chương <select aria-label="Chương" value={chapterId} disabled={!courseId || loading} onChange={e => choose(courseId, Number(e.target.value))}>
        <option value={0}>Chọn chương</option>{chapters.map(c => <option key={c.id} value={c.id}>Chương {c.chapterNo}: {c.title}</option>)}
      </select></label>
    </div>
    {loading ? <p role="status">Đang tải bài học Kanji…</p> : error ? <p role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>Thử lại</button></p>
      : !chapterId ? <p>Chọn môn học và chương để xem các bài học Kanji.</p>
        : lessons.length === 0 ? <div className="admin-empty-state"><p>Chương này chưa có bài học Kanji.</p>
          <Link className="mod-btn-add" to={`/moderator/courses/${courseId}/chapters/${chapterId}?skill=kanji`}>Tạo bài học Kanji</Link></div>
          : <div className="admin-table-card kanji-table"><table><thead><tr><th>Bài</th><th>Tên bài học</th><th>Thao tác</th></tr></thead>
            <tbody>{lessons.map(l => <tr key={l.id}><td>{l.lessonNo}</td><td>{l.title}</td><td><button className="mod-btn-add" onClick={() => choose(courseId, chapterId, l.id)}>Quản lý Kanji</button></td></tr>)}</tbody>
          </table></div>}
  </div>;
}
