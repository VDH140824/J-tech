import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCourses, getCourse, type CourseSummary, type ChapterSummary } from "../../../api/courseApi";
import { ModeratorKanjiPage } from "./ModeratorKanjiPage";

export function ModeratorKanjiManagementPage() {
  const [params, setParams] = useSearchParams();
  const courseId = Number(params.get("courseId")) || 0;
  const chapterId = Number(params.get("chapterId")) || 0;
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setChapters([]);
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
      } catch (e) {
        if (active) setError(e instanceof Error && !('isAxiosError' in e) ? e.message : "Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [courseId, chapterId, retry]);
  const choose = (course: number, chapter = 0) => {
    const next = new URLSearchParams();
    if (course) next.set("courseId", String(course));
    if (chapter) next.set("chapterId", String(chapter));
    setParams(next);
  };
  if (chapterId && !loading && !error && chapters.some(chapter => chapter.id === chapterId)) return <ModeratorKanjiPage key={chapterId} chapterId={chapterId} onBack={() => choose(courseId)} />;
  return <div className="admin-page-container kanji-page">
    <div className="admin-page-header"><div><h2 className="admin-main-title">Quản lý Kanji</h2>
      <p className="admin-main-subtitle">Chọn chương để tải tài liệu, tạo bài tập và flashcard Kanji.</p></div></div>
    <div className="mod-section-toolbar" style={{ flexWrap: "wrap", gap: 16 }}>
      <label>Môn học <select aria-label="Môn học" value={courseId} onChange={e => choose(Number(e.target.value))}>
        <option value={0}>Chọn môn học</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select></label>
      <label>Chương <select aria-label="Chương" value={chapterId} disabled={!courseId || loading} onChange={e => choose(courseId, Number(e.target.value))}>
        <option value={0}>Chọn chương</option>{chapters.map(c => <option key={c.id} value={c.id}>Chương {c.chapterNo}: {c.title}</option>)}
      </select></label>
    </div>
    {loading ? <p role="status">Đang tải chương…</p> : error ? <p role="alert">{error} <button onClick={() => setRetry(n => n + 1)}>Thử lại</button></p> : <p>Chọn môn học và chương để quản lý Kanji.</p>}
  </div>;
}
