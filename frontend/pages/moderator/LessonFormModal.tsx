import { useState, useEffect } from "react";
import type { LessonFormInput, LessonSummary } from "../../api/lessonApi";

interface LessonFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: LessonFormInput) => Promise<void>;
  editingLesson: LessonSummary | null;
  skillLabel: string;
  skillColor?: string;
  defaultLessonNo?: number;
}

export function LessonFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingLesson,
  skillLabel,
  skillColor = "#0d9488",
  defaultLessonNo = 1,
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
  }, [editingLesson, defaultLessonNo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề bài học!");
      return;
    }
    if (!formData.lessonNo || formData.lessonNo < 1) {
      setErrorMsg("Số bài học (lesson_no) phải lớn hơn hoặc bằng 1!");
      return;
    }

    const cleanPayload: LessonFormInput = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description?.trim() || undefined,
      documents: formData.documents?.trim() || undefined,
    };

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await onSubmit(cleanPayload);
      onClose();
    } catch (err: unknown) {
      console.error("Lỗi khi lưu bài học:", err);
      const anyErr = err as { response?: { data?: { message?: string } | string } };
      const serverMsg =
        (typeof anyErr?.response?.data === "object" ? anyErr?.response?.data?.message : null) ||
        (typeof anyErr?.response?.data === "string" ? anyErr.response.data : null);
      setErrorMsg(serverMsg || "Đã xảy ra lỗi khi lưu bài học. Vui lòng kiểm tra lại dữ liệu!");
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
                Nhập các thông tin của bài học theo bảng cơ sở dữ liệu <code>lesson</code>
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
                Số bài học (lesson_no) <span style={{ color: "#ef4444" }}>*</span>
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
                Thứ tự sắp xếp (display_order) <span style={{ color: "#ef4444" }}>*</span>
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
              Tiêu đề bài học (title) <span style={{ color: "#ef4444" }}>*</span>
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
            <label className="modal-label">Mô tả / Nội dung bài học (description)</label>
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
              <label className="modal-label">Trạng thái phát hành (status)</label>
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
                <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="HIDDEN">Ẩn (HIDDEN)</option>
                <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
              </select>
            </div>

            <div className="modal-field-group">
              <label className="modal-label">Tài liệu đính kèm (documents)</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Link tài liệu hoặc ghi chú file JSON..."
                value={formData.documents || ""}
                onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
              />
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
