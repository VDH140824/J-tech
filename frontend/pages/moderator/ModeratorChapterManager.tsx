import { useEffect, useRef, useState, type FormEvent } from "react";
import { deleteChapter, listChapters, saveChapter, type ChapterInput, type ModeratorChapter } from "../../api/moderatorChapterApi";
import type { CourseStatus } from "../../api/moderatorCourseApi";
import { courseError } from "./CourseFormModal";

const statuses: Record<CourseStatus, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đã xuất bản", HIDDEN: "Đã ẩn", ARCHIVED: "Đã lưu trữ" };

export function ModeratorChapterManager({ courseId, onView, onCountChange }: {
  courseId: number;
  onView: (chapterId: number) => void;
  onCountChange: (count: number) => void;
}) {
  const [chapters, setChapters] = useState<ModeratorChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [retry, setRetry] = useState(0);
  const [editor, setEditor] = useState<{ chapter: ModeratorChapter | null } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const countCallback = useRef(onCountChange);
  countCallback.current = onCountChange;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    listChapters(courseId, controller.signal).then(data => {
      if (!controller.signal.aborted) { setChapters(data); countCallback.current(data.length); }
    }).catch(e => { if (!controller.signal.aborted) setError(courseError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [courseId, retry]);
  async function remove(chapter: ModeratorChapter) {
    if (!window.confirm(`Xóa chương “${chapter.title}”? Chỉ có thể xóa chương không có nội dung hoặc dữ liệu học tập liên quan.`)) return;
    setDeleting(chapter.id); setActionError("");
    try { await deleteChapter(courseId, chapter.id); setRetry(n => n + 1); }
    catch (e) { setActionError(courseError(e)); }
    finally { setDeleting(null); }
  }
  return <section className="chapter-manager" aria-label="Quản lý chương">
    <div className="chapter-manager-header"><h3>Danh sách chương</h3><button className="mod-btn-detail" disabled={loading || deleting !== null} onClick={() => setEditor({ chapter: null })}>+ Thêm chương</button></div>
    {actionError && <p className="course-list-error" role="alert">{actionError}</p>}
    {editor && <ChapterForm key={editor.chapter?.id ?? "new"} courseId={courseId} chapter={editor.chapter} nextNumber={Math.max(0, ...chapters.map(c => c.chapterNo)) + 1} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); setActionError(""); setRetry(n => n + 1); }} />}
    {loading ? <p role="status">Đang tải chương…</p> : error ? <p role="alert">{error} <button className="mod-btn-detail" onClick={() => setRetry(n => n + 1)}>Thử lại</button></p> : !chapters.length ? <p>Khóa học chưa có chương. Chọn “Thêm chương” để bắt đầu.</p> : <div className="mod-chapters-list">{chapters.map(ch => <div key={ch.id} className="mod-chapter-row">
      <div className="mod-chapter-info"><span className="mod-chapter-no">Chương {ch.chapterNo}</span><span className="mod-chapter-title">{ch.title}</span>{ch.description && <span className="mod-chapter-desc">{ch.description}</span>}<small>Thứ tự: {ch.displayOrder} · {statuses[ch.status]}</small></div>
      <div className="chapter-manager-actions"><button className="mod-btn-view-chapter" onClick={() => onView(ch.id)}>Quản lý bài học</button><button className="mod-btn-detail" disabled={deleting !== null} onClick={() => setEditor({ chapter: ch })}>Sửa</button><button className="mod-btn-detail chapter-delete" disabled={deleting !== null} onClick={() => remove(ch)}>{deleting === ch.id ? "Đang xóa…" : "Xóa"}</button></div>
    </div>)}</div>}
  </section>;
}

function ChapterForm({ courseId, chapter, nextNumber, onClose, onSaved }: {
  courseId: number; chapter: ModeratorChapter | null; nextNumber: number; onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<ChapterInput>(chapter ? { ...chapter, description: chapter.description ?? "" } : { chapterNo: nextNumber, title: "", description: "", displayOrder: nextNumber, status: "DRAFT" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!form.title.trim()) { setError("Vui lòng nhập tên chương."); return; }
    setSaving(true); setError("");
    try { await saveChapter(courseId, chapter?.id ?? null, { ...form, title: form.title.trim(), description: form.description.trim() }); onSaved(); }
    catch (e) { setError(courseError(e)); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="course-form-dialog" aria-labelledby="chapter-form-title" onCancel={e => { e.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={submit}><h2 id="chapter-form-title">{chapter ? "Sửa chương" : "Thêm chương"}</h2>
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={saving}>
        <label>Số chương<input type="number" min={1} max={65535} required value={form.chapterNo} onChange={e => setForm({ ...form, chapterNo: Number(e.target.value) })} /></label>
        <label>Tên chương<input autoFocus required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>Mô tả<textarea rows={4} maxLength={10000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label>Thứ tự hiển thị<input type="number" required min={0} max={2147483647} value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} /></label>
        <label>Trạng thái<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CourseStatus })}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </fieldset>
      <div className="course-list-pagination"><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button disabled={saving}>{saving ? "Đang lưu…" : "Lưu chương"}</button></div>
    </form>
  </dialog>;
}
