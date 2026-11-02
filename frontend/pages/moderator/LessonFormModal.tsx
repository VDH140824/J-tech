import { useState, useEffect, useRef } from "react";
import type { LessonFormInput, LessonSummary } from "../../api/lessonApi";
import { kanjiErrorMessage } from "./kanji/kanjiMessages";
import { lessonDocuments } from "./kanji/lessonDocuments";

interface LessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: LessonFormInput, documentFile?: File) => Promise<void>;
  editingLesson: LessonSummary | null;
  skillLabel: string;
  skillColor?: string;
  defaultLessonNo?: number;
  vietnameseOnly?: boolean;
}

export function LessonFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingLesson,
  skillLabel,
  skillColor = "#0d9488",
  defaultLessonNo = 1,
  vietnameseOnly = false,
}: LessonFormModalProps) {
  const [formData, setFormData] = useState<LessonFormInput>({
    lessonNo: defaultLessonNo,
    title: "",
    description: "",
    documents: "",
    displayOrder: defaultLessonNo,
    status: "PUBLISHED",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [documentFile, setDocumentFile] = useState<File>();
  const [documentLink, setDocumentLink] = useState("");
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLesson) {
      setFormData({
        skillType: editingLesson.skillType,
        lessonNo: editingLesson.lessonNo,
        title: editingLesson.title,
        description: editingLesson.description || "",
        documents: editingLesson.documents || "",
        displayOrder: editingLesson.displayOrder,
        status: editingLesson.status,
      });
    } else {
      setFormData({
        lessonNo: defaultLessonNo,
        title: "",
        description: "",
        documents: "",
        displayOrder: defaultLessonNo,
        status: "PUBLISHED",
      });
    }
    setErrorMsg(null);
    setDocumentFile(undefined);
    setDocumentLink("");
  }, [editingLesson, defaultLessonNo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề bài học!");
      return;
    }
    if (!formData.lessonNo || formData.lessonNo < 1) {
      setErrorMsg(vietnameseOnly ? "Số bài học phải lớn hơn hoặc bằng 1!" : "Số bài học (lesson_no) phải lớn hơn hoặc bằng 1!");
      return;
    }

    if (vietnameseOnly && documentLink.trim() && !/^https?:\/\/[^\s]+$/i.test(documentLink.trim())) {
      setErrorMsg("Vui lòng nhập đường dẫn tài liệu bắt đầu bằng http:// hoặc https://."); return;
    }
    const documents = vietnameseOnly && documentLink.trim()
      ? JSON.stringify([...lessonDocuments(formData.documents), { name: "Tài liệu tham khảo", url: documentLink.trim() }])
      : formData.documents?.trim() || undefined;
    const cleanPayload: LessonFormInput = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      documents,
    };

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await onSubmit(cleanPayload, vietnameseOnly ? documentFile : undefined);
      onClose();
    } catch (err: unknown) {
      console.error("Lỗi khi lưu bài học:", err);
      const anyErr = err as { response?: { data?: { message?: string } | string } };
      const serverMsg =
        (typeof anyErr?.response?.data === "object" ? anyErr?.response?.data?.message : null) ||
        (typeof anyErr?.response?.data === "string" ? anyErr.response.data : null);
      setErrorMsg(vietnameseOnly ? kanjiErrorMessage(err) : serverMsg || "Đã xảy ra lỗi khi lưu bài học. Vui lòng kiểm tra lại dữ liệu!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div
        className="modal-card"
        style={{ maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: `${skillColor}15`,
                color: skillColor,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1.1rem",
              }}
            >
              {editingLesson ? "✏️" : "➕"}
            </span>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>
                {editingLesson ? "Chỉnh sửa bài học" : `Thêm bài học mới (${skillLabel})`}
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                {vietnameseOnly ? "Nhập thông tin và đính kèm tài liệu cho bài học chữ Hán." : <>Nhập các thông tin của bài học theo bảng cơ sở dữ liệu <code>lesson</code></>}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-btn-close"
            disabled={submitting}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              margin: "16px 24px 0",
              padding: "10px 14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "8px",
              fontSize: "0.86rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form-body">
          {/* Row 1: lesson_no & display_order */}
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label">
                {vietnameseOnly ? "Số bài học" : "Số bài học (lesson_no)"} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                className="modal-input"
                placeholder="Ví dụ: 1, 2, 3..."
                value={formData.lessonNo}
                onChange={(e) => {
                  const num = e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                  setFormData({ ...formData, lessonNo: num });
                }}
                required
              />
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Định danh số thứ tự bài học trong chương (VD: Bài 1, Bài 2)
              </span>
            </div>

            <div className="modal-field-group">
              <label className="modal-label">
                {vietnameseOnly ? "Thứ tự sắp xếp" : "Thứ tự sắp xếp (display_order)"} <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                className="modal-input"
                value={formData.displayOrder ?? 0}
                required
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0),
                  })
                }
              />
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Thứ tự ưu tiên hiển thị trên danh sách
              </span>
            </div>
          </div>

          {/* Row 2: title */}
          <div className="modal-field-group">
            <label className="modal-label">
              {vietnameseOnly ? "Tiêu đề bài học" : "Tiêu đề bài học (title)"} <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              className="modal-input"
              placeholder="Nhập tên tiêu đề bài học (Ví dụ: Chào hỏi, Danh từ chỉ đồ vật...)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Row 3: description */}
          <div className="modal-field-group">
            <label className="modal-label">{vietnameseOnly ? "Mô tả / Nội dung bài học" : "Mô tả / Nội dung bài học (description)"}</label>
            <textarea
              className="modal-textarea"
              placeholder="Mô tả mục tiêu, kiến thức trọng tâm của bài học..."
              rows={3}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Row 4: status & documents */}
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label">{vietnameseOnly ? "Trạng thái phát hành" : "Trạng thái phát hành (status)"}</label>
              <select
                className="modal-input"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED",
                  })
                }
              >
                <option value="PUBLISHED">{vietnameseOnly ? "Đã xuất bản" : "Đã xuất bản (PUBLISHED)"}</option>
                <option value="DRAFT">{vietnameseOnly ? "Bản nháp" : "Bản nháp (DRAFT)"}</option>
                <option value="HIDDEN">{vietnameseOnly ? "Ẩn" : "Ẩn (HIDDEN)"}</option>
                <option value="ARCHIVED">{vietnameseOnly ? "Lưu trữ" : "Lưu trữ (ARCHIVED)"}</option>
              </select>
            </div>

            <div className="modal-field-group">
              <label className="modal-label">{vietnameseOnly ? "Tài liệu đính kèm" : "Tài liệu đính kèm (documents)"}</label>
              <div style={vietnameseOnly ? { display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, padding: 4, gap: 4, minWidth: 0 } : undefined}>
              <input
                type="text"
                className="modal-input"
                aria-label={vietnameseOnly ? "Đường dẫn hoặc tệp tài liệu" : undefined}
                placeholder={vietnameseOnly ? "Dán đường dẫn hoặc chọn tệp…" : "Link tài liệu hoặc ghi chú file JSON..."}
                value={vietnameseOnly ? documentFile?.name || documentLink : formData.documents || ""}
                readOnly={vietnameseOnly && !!documentFile}
                disabled={vietnameseOnly && submitting}
                style={vietnameseOnly ? { border: 0, boxShadow: "none", flex: 1, minWidth: 0, width: "auto" } : undefined}
                onChange={(e) => vietnameseOnly ? setDocumentLink(e.target.value) : setFormData({ ...formData, documents: e.target.value })}
              />
              {vietnameseOnly && <>
                {(documentFile || documentLink) && <button type="button" aria-label="Bỏ tài liệu đã chọn" disabled={submitting} onClick={() => {
                  setDocumentFile(undefined); setDocumentLink("");
                  if (documentInputRef.current) documentInputRef.current.value = "";
                }} style={{ border: 0, background: "transparent", cursor: "pointer", padding: 6 }}>×</button>}
                <button type="button" disabled={submitting} onClick={() => documentInputRef.current?.click()} style={{ whiteSpace: "nowrap", border: 0, borderRadius: 6, padding: "9px 10px", background: "#f1f5f9", color: "#334155", cursor: "pointer" }}>Chọn tệp</button>
              </>}
              </div>
              {vietnameseOnly && <>
                {lessonDocuments(formData.documents).map((doc, index) => <div key={`${doc.url}-${index}`} style={{ margin: "8px 0", overflowWrap: "anywhere" }}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">{doc.name}</a>{" "}
                  <button type="button" disabled={submitting} onClick={() => setFormData({ ...formData, documents: JSON.stringify(lessonDocuments(formData.documents).filter((_, i) => i !== index)) })}>Bỏ đính kèm</button>
                </div>)}
                <input ref={documentInputRef} hidden type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && (file.size === 0 || file.size > 10 * 1024 * 1024 || !/\.(pdf|docx|txt|png|jpe?g)$/i.test(file.name))) {
                    setErrorMsg("Chọn tệp PDF, DOCX, TXT, PNG hoặc JPG có dữ liệu và không quá 10 MB.");
                    setDocumentFile(undefined); e.target.value = ""; return;
                  }
                  if (file) { setDocumentFile(file); setDocumentLink(""); }
                  setErrorMsg(null);
                }} />
                <p style={{ fontSize: "0.75rem", color: "#64748b" }}>Đường dẫn hoặc tệp PDF, DOCX, TXT, PNG, JPG · Tối đa 10 MB.</p>
              </>}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions-row">
            <button
              type="button"
              className="btn-modal-cancel"
              disabled={submitting}
              onClick={onClose}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              style={{ backgroundColor: skillColor }}
              disabled={submitting}
            >
              {submitting ? "Đang lưu..." : editingLesson ? "Lưu thay đổi" : "Tạo bài học"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
