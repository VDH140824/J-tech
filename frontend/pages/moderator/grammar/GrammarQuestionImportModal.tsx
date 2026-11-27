import axios from "axios";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { importGrammarQuestions, type GrammarQuestionImportError, type GrammarQuestionImportResult } from "../../../api/grammarQuestionApi";
import { GRAMMAR_IMPORT_MAX_BYTES, GRAMMAR_IMPORT_MAX_QUESTIONS } from "../../../config/grammarQuestionImport";
import "./GrammarQuestionImportModal.css";

interface Props {
  grammarId: number;
  onClose: () => void;
  onImported: (result: GrammarQuestionImportResult) => Promise<void>;
}

export function GrammarQuestionImportModal({ grammarId, onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<GrammarQuestionImportError[]>([]);
  const busy = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  function selectFile(selected: File | null) {
    setErrors([]);
    setMessage(null);
    setFile(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      setMessage("Vui lòng chọn file Excel .xlsx.");
    } else if (selected.size === 0) {
      setMessage("File đang trống. Vui lòng chọn file có dữ liệu.");
    } else if (selected.size > GRAMMAR_IMPORT_MAX_BYTES) {
      setMessage("File Excel không được vượt quá 5 MB.");
    } else {
      setFile(selected);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy.current) return;
    busy.current = true;
    setImporting(true);
    setMessage(null);
    setErrors([]);
    let result: GrammarQuestionImportResult;
    try {
      result = await importGrammarQuestions(grammarId, file);
    } catch (error) {
      const apiError = axios.isAxiosError<{ message?: string; errors?: GrammarQuestionImportError[] }>(error) ? error : null;
      setMessage(apiError?.response?.data?.message || (apiError && !apiError.response
        ? "Mất kết nối khi nhập câu hỏi. Hãy tải lại danh sách để kiểm tra kết quả trước khi nhập lại file."
        : "Không thể nhập câu hỏi. Vui lòng thử lại."));
      const rowErrors = apiError?.response?.data?.errors;
      if (Array.isArray(rowErrors)) setErrors(rowErrors);
      return;
    } finally {
      busy.current = false;
      setImporting(false);
    }
    setFile(null);
    if (input.current) input.current.value = "";
    // A list-refresh failure must not be presented as a failed import.
    await onImported(result);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card grammar-import-dialog" ref={dialog} role="dialog" aria-modal="true"
        aria-labelledby="grammar-import-title" aria-describedby="grammar-import-description"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !busy.current) onClose();
          if (event.key !== "Tab") return;
          const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [tabindex='0']");
          if (!focusable?.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}>
        <div className="modal-header">
          <h3 className="modal-title" id="grammar-import-title">Nhập câu hỏi Grammar từ Excel</h3>
          <button className="modal-btn-close" type="button" aria-label="Đóng" disabled={importing} onClick={onClose}>✕</button>
        </div>
        <form className="modal-form-body" onSubmit={(event) => void submit(event)} aria-busy={importing}>
          <div className="grammar-import-help" id="grammar-import-description">
            <p>Dùng mẫu Excel, giữ tiêu đề ở dòng 2 và nhập câu hỏi từ dòng 3. Tối đa {GRAMMAR_IMPORT_MAX_QUESTIONS} câu/file, dung lượng 5 MB.</p>
            <p>Nhập đủ nội dung, bốn lựa chọn A–D, một đáp án đúng, giải thích và độ khó. Nội dung, giải thích và mỗi lựa chọn tối đa 100 ký tự.</p>
            <p>Độ khó: Dễ, Trung bình, Khó hoặc EASY, MEDIUM, HARD. Không dùng công thức. Xóa các câu ví dụ trước khi nhập file.</p>
            <p>STT chỉ để đối chiếu. Thứ tự hiển thị tự nối tiếp danh sách hiện tại. Có lỗi thì chưa lưu câu nào.</p>
            <p>Nhập lại file đã thành công sẽ thêm câu hỏi mới; hệ thống chưa tự loại câu trùng.</p>
          </div>
          <label className="modal-label" htmlFor="grammar-import-file">File Excel (.xlsx)</label>
          <input id="grammar-import-file" ref={input} className="modal-input grammar-import-file" type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={importing} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
          {file && <p className="grammar-import-filename">Đã chọn: {file.name} ({Math.ceil(file.size / 1024)} KB)</p>}
          {importing && <p role="status">Đang kiểm tra và nhập câu hỏi. Vui lòng chờ kết quả…</p>}
          {message && <div role="alert" className="grammar-import-error">
            <p>{message}</p>
            {errors.length > 0 && <p>{new Set(errors.filter((error) => error.row > 2).map((error) => error.row)).size} dòng dữ liệu có lỗi; tổng cộng {errors.length} lỗi.</p>}
          </div>}
          {errors.length > 0 && <div className="grammar-import-errors" tabIndex={0} aria-label="Chi tiết lỗi Excel">
            <table>
              <caption>Chi tiết lỗi trong file Excel</caption>
              <thead><tr><th scope="col">Dòng Excel</th><th scope="col">Cột</th><th scope="col">Nội dung lỗi</th></tr></thead>
              <tbody>{errors.map((error, index) => <tr key={`${error.row}-${error.column}-${index}`}>
                <td>{error.row > 0 ? error.row : "Toàn file"}</td><td>{error.column}</td><td>{error.message}</td>
              </tr>)}</tbody>
            </table>
          </div>}
          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" disabled={importing} onClick={onClose}>Hủy</button>
            <button type="submit" className="mod-btn-add mod-question-btn--primary" disabled={!file || importing}>
              {importing ? "Đang nhập…" : "Nhập câu hỏi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
