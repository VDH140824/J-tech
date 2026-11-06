import { Fragment, useEffect, useState } from "react";
import { listCourses, type CoursePage, type CourseStatus } from "../../api/moderatorCourseApi";
import { ModeratorChapterManager } from "./ModeratorChapterManager";
import type { ModeratorNavState } from "./ModeratorPortalPage";
import "./ModeratorCoursesTab.css";
import { CourseFormModal, courseError } from "./CourseFormModal";
import { deleteCourse, type ModeratorCourse } from "../../api/moderatorCourseApi";
const statuses: Record<CourseStatus, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", HIDDEN: "Đã ẩn", ARCHIVED: "Đã lưu trữ" };
export function ModeratorCoursesTab({ onViewChapter }: { onViewChapter: (state: ModeratorNavState) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(5);
  const [result, setResult] = useState<CoursePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editor, setEditor] = useState<{ id: number | null } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");
  const removeCourse = async (course: ModeratorCourse) => {
    const message = course.chapterCount > 0
      ? `Xóa khóa học “${course.name}” khỏi danh sách? Nội dung chương, bài học và dữ liệu học tập vẫn được giữ lại.`
      : `Xóa vĩnh viễn khóa học trống “${course.name}”? Thao tác này không thể hoàn tác.`;
    if (!window.confirm(message)) return;
    setDeleting(course.id); setActionError("");
    try { await deleteCourse(course.id); setRetry(n => n + 1); }
    catch (e) { setActionError(courseError(e)); }
    finally { setDeleting(null); }
  };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setExpanded(null);
    const timer = window.setTimeout(() => {
      listCourses(search.trim(), status, page, size, controller.signal).then(data => {
        if (controller.signal.aborted) return;
        if (page > 0 && page >= data.totalPages) { setPage(Math.max(0, data.totalPages - 1)); return; }
        setResult(data);
      }).catch(() => { if (!controller.signal.aborted) setError("Không thể tải danh sách khóa học. Vui lòng thử lại."); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, status, page, size, retry]);
  const totalPages = result?.totalPages ?? 0;
  const pageNumbers = Array.from(new Set([0, page - 1, page, page + 1, totalPages - 1]))
    .filter(n => n >= 0 && n < totalPages).sort((a, b) => a - b);
  const toggleCourse = (id: number) => {
    setExpanded(expanded === id ? null : id);
  };
  return <div className="admin-page-container course-list">
    <header className="course-list-header">
      <div className="course-list-heading"><CourseIcon name="book" /><div><h2>Quản lý khóa học</h2><p>Tạo, chỉnh sửa và quản lý các khóa học tiếng Nhật.</p></div></div>
      <button className="course-create-button" onClick={() => setEditor({ id: null })}><span aria-hidden="true">+</span> Tạo khóa học</button>
    </header>
    {actionError && <p className="course-list-error" role="alert">{actionError}</p>}
    {editor && <CourseFormModal id={editor.id} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setRetry(n => n + 1); }} />}
    <div className="course-list-filters">
      <div className="course-search"><CourseIcon name="search" /><input aria-label="Tìm kiếm khóa học" type="search" maxLength={150} placeholder="Tìm khóa học theo tên, mã…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></div>
      <select aria-label="Lọc theo trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Tất cả trạng thái</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Số khóa học mỗi trang" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>{[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} khóa học / trang</option>)}</select>
      {(search || status) && <button className="course-reset" onClick={() => { setSearch(""); setStatus(""); setPage(0); }}>Xóa bộ lọc</button>}
    </div>
    <div className="course-table-container" aria-busy={loading}>
      {loading ? <div className="admin-table-loading" role="status"><div className="admin-spinner mod-spinner" />Đang tải khóa học…</div> : error ? <div className="admin-table-empty" role="alert">{error} <button className="mod-btn-detail" onClick={() => setRetry(n => n + 1)}>Thử lại</button></div> :
        <div className="admin-table-responsive"><table className="course-list-table">
          <caption className="course-sr-only">Danh sách khóa học, gồm {result?.totalElements ?? 0} kết quả</caption>
          <thead><tr><th scope="col">#</th><th scope="col">Ảnh</th><th scope="col">Tên khóa học</th><th scope="col">Chương</th><th scope="col">Bài học</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
          <tbody>{result?.content.length ? result.content.map((course, index) => <Fragment key={course.id}>
            <tr><td>{page * size + index + 1}</td><td><CourseThumbnail url={course.thumbnailUrl} /></td>
              <td className="course-title-cell"><h3>{course.name}</h3><span className="course-code">{course.code}</span><p>{course.description || "Chưa có mô tả"}</p></td>
              <td className="course-count-cell">{course.chapterCount}</td><td className="course-count-cell">{course.lessonCount}</td>
              <td><span className={"course-status course-status-" + course.status.toLowerCase()}>{course.status === "PUBLISHED" && <span aria-hidden="true">● </span>}{statuses[course.status]}</span></td>
              <td><div className="course-row-actions">
                <button className="course-icon-button" title="Xem chương và quản lý bài học" aria-label={"Xem nội dung " + course.name} aria-expanded={expanded === course.id} aria-controls={"course-chapters-" + course.id} onClick={() => toggleCourse(course.id)}><CourseIcon name="eye" /></button>
                <button className="course-icon-button" title="Sửa khóa học" aria-label={"Sửa " + course.name} onClick={() => setEditor({ id: course.id })}><CourseIcon name="edit" /></button>
                <button className="course-icon-button course-delete-button" disabled={deleting !== null} title={course.chapterCount > 0 ? "Xóa mềm, giữ lại nội dung" : "Xóa vĩnh viễn khóa học trống"} aria-label={"Xóa " + course.name} onClick={() => removeCourse(course)}><CourseIcon name="trash" /></button>
              </div></td></tr>
            {expanded === course.id && <tr><td colSpan={7}><div id={"course-chapters-" + course.id} className="mod-chapters-panel">
              <ModeratorChapterManager courseId={course.id} onView={chapterId => onViewChapter({ courseId: course.id, chapterId })} onCountChange={count => setResult(current => current ? { ...current, content: current.content.map(item => item.id === course.id ? { ...item, chapterCount: count } : item) } : current)} />
            </div></td></tr>}
          </Fragment>) : <tr><td colSpan={7} className="admin-table-empty">{search || status ? "Không tìm thấy khóa học phù hợp. Hãy thay đổi bộ lọc." : "Chưa có khóa học nào trong hệ thống."}</td></tr>}</tbody>
        </table></div>}
    </div>
    {!loading && !error && <footer className="course-list-footer"><span>{result?.totalElements ?? 0} khóa học</span><nav className="course-list-pagination" aria-label="Phân trang khóa học">
      <button aria-label="Trang trước" disabled={page === 0} onClick={() => setPage(n => n - 1)}>‹</button>
      {pageNumbers.map((n, index) => <Fragment key={n}>{index > 0 && n - pageNumbers[index - 1] > 1 && <span>…</span>}<button aria-label={"Trang " + (n + 1)} aria-current={page === n ? "page" : undefined} onClick={() => setPage(n)}>{n + 1}</button></Fragment>)}
      <button aria-label="Trang sau" disabled={page + 1 >= totalPages} onClick={() => setPage(n => n + 1)}>›</button>
    </nav><span>Trang {totalPages ? page + 1 : 0} / {totalPages}</span></footer>}
  </div>;
}
function CourseThumbnail({ url }: { url?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? <img className="course-thumbnail" src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span className="course-thumbnail course-thumbnail-fallback" aria-hidden="true">あ</span>;
}
function CourseIcon({ name }: { name: "book" | "search" | "eye" | "edit" | "trash" }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "book" && <><path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Z" /><path d="M12 5v15" /></>}
    {name === "search" && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>}
    {name === "eye" && <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}
    {name === "edit" && <><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m13 6 5 5" /></>}
    {name === "trash" && <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>}
  </svg>;
}
