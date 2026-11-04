import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { updateClass, type ClassResponse, type ClassroomStatus } from "../../api/classApi";

export function ClassEditModal({ classroom, onClose, onUpdated }: { classroom: ClassResponse; onClose: () => void; onUpdated: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const [code, setCode] = useState(classroom.code);
  const [description, setDescription] = useState(classroom.description ?? "");
  const [status, setStatus] = useState<ClassroomStatus>(classroom.status);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const value = code.trim();
    const detail = description.trim();
    if (!value) return setError("Vui lòng nhập mã lớp.");
    if (value.length > 30) return setError("Mã lớp không được vượt quá 30 ký tự.");
    if (!/^[A-Za-z0-9_-]+$/.test(value)) return setError("Mã lớp chỉ được chứa chữ cái không dấu, số, dấu _ và dấu -.");
    if (Array.from(detail).length > 100) return setError("Mô tả không được vượt quá 100 ký tự.");
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await updateClass(classroom.id, { code: value, description: detail || null, status });
      onUpdated();
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined;
      setError((status === 400 || status === 403 || status === 404 || status === 409) && typeof message === "string"
        ? message : "Không thể cập nhật lớp học. Vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="class-create-modal" aria-labelledby="class-edit-title"
      onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
      <form onSubmit={submitForm} noValidate>
        <div className="class-create-header">
          <h2 id="class-edit-title">Chỉnh sửa lớp học</h2>
          <button type="button" className="class-create-close" aria-label="Đóng form chỉnh sửa lớp"
            disabled={busy} onClick={onClose}>×</button>
        </div>
        <label htmlFor="class-edit-code">Mã lớp <span className="class-create-required">*</span></label>
        <input id="class-edit-code" autoFocus value={code} disabled={busy} placeholder="Ví dụ: 111_SE1601"
          onChange={(event) => setCode(event.target.value)} aria-describedby="class-edit-code-help" />
        <small id="class-edit-code-help">Tối đa 30 ký tự: chữ cái không dấu, số, _ và -.</small>
        <label htmlFor="class-edit-description">Mô tả lớp học</label>
        <textarea id="class-edit-description" rows={3} value={description} disabled={busy}
          placeholder="Nhập mô tả hoặc ghi chú cho lớp học…"
          onChange={(event) => setDescription(event.target.value)} aria-describedby="class-edit-description-help" />
        <small id="class-edit-description-help">{Array.from(description.trim()).length}/100 ký tự</small>
        <div className="class-create-status">
          <label htmlFor="class-edit-status">Trạng thái hoạt động <span className="class-create-required">*</span></label>
          <select id="class-edit-status" value={status} disabled={busy}
            onChange={(event) => setStatus(event.target.value as ClassroomStatus)}>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="ARCHIVED">Lưu trữ</option>
            <option value="CLOSED">Đã đóng</option>
          </select>
        </div>
        {error && <p className="class-list-error" role="alert">{error}</p>}
        <div className="class-create-buttons">
          <button type="button" className="class-create-cancel" disabled={busy} onClick={onClose}>Hủy</button>
          <button type="submit" className="class-create-submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
        </div>
      </form>
    </dialog>
  );
}
