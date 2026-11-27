import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { importKanjiExercises, type KanjiExcelError } from "../../../api/kanjiChapterApi";

export function useKanjiDialog(open: boolean, onClose: () => void, busy: boolean) {
  const dialog = useRef<HTMLElement>(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const nodes = () => dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
    nodes()?.[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !latest.current.busy) { event.preventDefault(); latest.current.onClose(); }
      if (event.key !== "Tab") return;
      const items = nodes();
      if (!items?.length) { event.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (!dialog.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [open]);
  return dialog;
}

export function KanjiExerciseImportModal({ chapterId, documentLessonId, documentName, onClose, onImported }: {
  chapterId: number; documentLessonId: number; documentName: string;
  onClose: () => void; onImported: (count: number) => Promise<void>;
}) {
  const [file, setFile] = useState<File>();
  const [busy, setBusy] = useState(false);
  const guard = useRef(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<KanjiExcelError[]>([]);
  const dialog = useKanjiDialog(true, onClose, busy);
  return <div className="modal-overlay"><section ref={dialog} className="modal-card kanji-excel-dialog" role="dialog" aria-modal="true"
    aria-labelledby="kanji-import-title">
    <div className="modal-header"><h3 id="kanji-import-title" className="modal-title">Nhập câu hỏi Kanji từ Excel</h3>
      <button type="button" className="modal-btn-close" disabled={busy} onClick={onClose} aria-label="Đóng">×</button></div>
    <form className="modal-form-body" onSubmit={async event => {
      event.preventDefault();
      if (!file || guard.current) return;
      guard.current = true; setBusy(true); setMessage(""); setErrors([]);
      let count: number;
      try { count = (await importKanjiExercises(chapterId, documentLessonId, file)).importedCount; }
      catch (error) {
        const data = axios.isAxiosError<{ message?: string; errors?: KanjiExcelError[] }>(error) ? error.response?.data : undefined;
        setMessage(data?.message || "Không xác nhận được kết quả nhập. Hãy tải lại danh sách trước khi nhập lại file.");
        if (Array.isArray(data?.errors)) setErrors(data.errors);
        return;
      } finally { guard.current = false; setBusy(false); }
      await onImported(count);
    }}>
      <p><strong>Tài liệu: {documentName}</strong></p>
      <p>Dùng mẫu Kanji, giữ tiêu đề dòng 2, nhập từ dòng 3. Tối đa 500 câu và 5 MB. Không dùng công thức.</p>
      <p>Loại câu hỏi: MCQ, FILL_IN, MATCHING. Độ khó: EASY, MEDIUM, HARD hoặc Dễ, Trung bình, Khó. Thứ tự hiển thị: 0–65535.</p>
      <p>MCQ: 2–6 lựa chọn liên tiếp A–F, đáp án đúng là chữ A–F. FILL_IN: nhập đáp án chữ. MATCHING: nhập cặp nối JSON, ví dụ {`{"日":"nhật","月":"nguyệt"}`}.</p>
      <p>Có lỗi thì chưa lưu câu nào. Nhập lại file thành công sẽ thêm câu mới. File xuất có thể dùng để nhập lại.</p>
      <label>File Excel (.xlsx)<input autoFocus type="file" accept=".xlsx" disabled={busy} onChange={event => {
        const selected = event.target.files?.[0]; setFile(undefined); setErrors([]); setMessage("");
        if (!selected) return;
        if (!/\.xlsx$/i.test(selected.name) || !selected.size || selected.size > 5 * 1024 * 1024) {
          setMessage("Chọn file .xlsx có dữ liệu, tối đa 5 MB."); return;
        }
        setFile(selected);
      }} /></label>
      {message && <p role="alert" className="kanji-error">{message}</p>}
      {!!errors.length && <ul role="alert">{errors.map((error, index) => <li key={index}>Dòng {error.row} · {error.column}: {error.message}</li>)}</ul>}
      <div className="modal-actions-row"><button type="button" className="btn-modal-cancel" disabled={busy} onClick={onClose}>Hủy</button>
        <button type="submit" className="mod-btn-add" disabled={busy || !file}>{busy ? "Đang nhập…" : "Nhập câu hỏi"}</button></div>
    </form>
  </section></div>;
}
