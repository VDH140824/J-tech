import { useEffect, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { getCourseForEdit, saveCourse, type CourseInput, type CourseStatus } from "../../api/moderatorCourseApi";
export function courseError(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.message || error.response?.data?.detail || "Không thể thực hiện thao tác. Vui lòng thử lại.";
  return "Không thể thực hiện thao tác. Vui lòng thử lại.";
}
export function CourseFormModal({ id, onClose, onSaved }: { id: number | null; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<CourseInput>({ code: "", name: "", description: "", thumbnailUrl: "", displayOrder: 0, status: "DRAFT" });
  const [loading, setLoading] = useState(id !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (id === null) return;
    let active = true;
    setLoading(true); setError("");
    getCourseForEdit(id).then(data => { if (active) setForm({ ...data, description: data.description || "", thumbnailUrl: data.thumbnailUrl || "" }); })
      .catch(e => { if (active) setError(courseError(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.code.trim() || !form.name.trim()) { setError("Vui lòng nhập mã và tên khóa học."); return; }
    setSaving(true); setError("");
    try { await saveCourse(id, { ...form, code: form.code.trim(), name: form.name.trim() }); onSaved(); }
    catch (e) { setError(courseError(e)); } finally { setSaving(false); }
  };
  return <dialog ref={dialog} className="course-form-dialog" aria-labelledby="course-form-title" onCancel={e => { e.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={submit}><h2 id="course-form-title">{id === null ? "Thêm khóa học" : "Sửa khóa học"}</h2>
      {error && <p role="alert">{error} {id !== null && !form.code && <button type="button" onClick={() => setRetry(n => n + 1)}>Thử lại</button>}</p>}
      {loading ? <p role="status">Đang tải khóa học…</p> : <fieldset disabled={saving || (id !== null && !form.code)}>
        <label>Mã khóa học<input autoFocus required maxLength={20} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></label>
        <label>Tên khóa học<input required maxLength={150} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <label>Mô tả<textarea rows={4} maxLength={10000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label>Đường dẫn ảnh<input type="url" pattern="https?://.*" maxLength={500} value={form.thumbnailUrl} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} /></label>
        <label>Thứ tự hiển thị<input type="number" min={0} max={2147483647} required value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} /></label>
        <label>Trạng thái<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as CourseStatus })}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="HIDDEN">Đã ẩn</option><option value="ARCHIVED">Đã lưu trữ</option></select></label>
      </fieldset>}
      <div className="course-list-pagination"><button type="button" className="mod-btn-detail" disabled={saving} onClick={onClose}>Hủy</button><button className="mod-btn-detail" disabled={loading || saving || (id !== null && !form.code)}>{saving ? "Đang lưu…" : "Lưu khóa học"}</button></div>
    </form>
  </dialog>;
}
