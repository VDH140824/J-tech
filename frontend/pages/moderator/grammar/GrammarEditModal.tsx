import axios from "axios";
import { useState } from "react";
import {
  updateGrammar,
  type GrammarFormInput,
  type GrammarItem,
} from "../../../api/grammarApi";

interface GrammarEditModalProps {
  grammar: GrammarItem;
  onClose: () => void;
  onUpdated: (grammar: GrammarItem) => void;
}

const allowedVideoTypes = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska",
]);

export function GrammarEditModal({ grammar, onClose, onUpdated }: GrammarEditModalProps) {
  const [form, setForm] = useState<GrammarFormInput>({
    structureName: grammar.structureName,
    meaningVi: grammar.meaningVi,
    usageExplanation: grammar.usageExplanation,
    exampleJp: grammar.exampleJp,
    exampleVi: grammar.exampleVi,
    videoUrl: grammar.videoUrl,
    videoPublicId: grammar.videoPublicId,
    videoDurationSec: grammar.videoDurationSec,
    displayOrder: grammar.displayOrder,
    status: grammar.status,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [stage, setStage] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const busy = stage !== "idle";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || videoError) return;

    const fields = [form.structureName, form.meaningVi, form.usageExplanation, form.exampleJp, form.exampleVi];
    if (fields.some((value) => !value.trim())) {
      setError("Vui lòng nhập đầy đủ các trường ngữ pháp bắt buộc.");
      return;
    }
    setError(null);

    try {
      setStage("saving");
      const updated = await updateGrammar(grammar.id, {
        ...form,
        structureName: form.structureName.trim(),
        meaningVi: form.meaningVi.trim(),
        usageExplanation: form.usageExplanation.trim(),
        exampleJp: form.exampleJp.trim(),
        exampleVi: form.exampleVi.trim(),
      }, videoFile);
      onUpdated(updated);
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setError(
        typeof backendMessage === "string" && backendMessage.trim()
          ? backendMessage
          : apiError?.response?.status
            ? `Không cập nhật được ngữ pháp (HTTP ${apiError.response.status}). Dữ liệu đã nhập vẫn được giữ để thử lại.`
            : "Không cập nhật được ngữ pháp. Dữ liệu đã nhập vẫn được giữ để thử lại."
      );
    } finally {
      setStage("idle");
    }
  };

  const handleVideoChange = (file: File | null) => {
    setVideoFile(null);
    setError(null);
    setVideoError(null);
    if (!file) return;
    if (!allowedVideoTypes.has(file.type)) {
      setVideoError("Định dạng video không được hỗ trợ.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setVideoError("Video phải nhỏ hơn 500 MB.");
      return;
    }
    setVideoFile(file);
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="grammar-edit-title" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title" id="grammar-edit-title">Chỉnh sửa ngữ pháp</h3>
          <button type="button" className="modal-btn-close" onClick={onClose} disabled={busy} aria-label="Đóng">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form-body">
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-edit-structure">Cấu trúc ngữ pháp *</label>
              <input id="grammar-edit-structure" className="modal-input" required maxLength={150} value={form.structureName} onChange={(e) => setForm({ ...form, structureName: e.target.value })} />
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-edit-meaning">Ý nghĩa tiếng Việt *</label>
              <input id="grammar-edit-meaning" className="modal-input" required maxLength={255} value={form.meaningVi} onChange={(e) => setForm({ ...form, meaningVi: e.target.value })} />
            </div>
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-edit-usage">Giải thích cách dùng *</label>
            <textarea id="grammar-edit-usage" className="modal-textarea" required rows={4} value={form.usageExplanation} onChange={(e) => setForm({ ...form, usageExplanation: e.target.value })} />
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-edit-example-jp">Ví dụ tiếng Nhật *</label>
            <textarea id="grammar-edit-example-jp" className="modal-textarea" required rows={2} value={form.exampleJp} onChange={(e) => setForm({ ...form, exampleJp: e.target.value })} />
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-edit-example-vi">Dịch ví dụ tiếng Việt *</label>
            <textarea id="grammar-edit-example-vi" className="modal-textarea" required rows={2} value={form.exampleVi} onChange={(e) => setForm({ ...form, exampleVi: e.target.value })} />
          </div>
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-edit-order">Thứ tự hiển thị</label>
              <input id="grammar-edit-order" className="modal-input" type="number" min="0" required value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-edit-status">Trạng thái</label>
              <select id="grammar-edit-status" className="modal-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GrammarFormInput["status"] })}>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã xuất bản</option>
                <option value="HIDDEN">Ẩn</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
              </select>
            </div>
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-edit-video">Thay video (tùy chọn)</label>
            {form.videoUrl && (
              <video controls preload="metadata" src={form.videoUrl} style={{ display: "block", width: "100%", maxHeight: "220px", background: "#0f172a", borderRadius: "8px", marginBottom: "10px" }} />
            )}
            <input id="grammar-edit-video" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska" onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)} disabled={busy} />
            {videoFile && <p style={{ color: "#64748b" }}>{videoFile.name} · Video mới sẽ được tải lên khi bạn lưu thay đổi.</p>}
          </div>
          {(videoError || error) && <p role="alert" style={{ color: "#b91c1c" }}>{videoError || error}</p>}
          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={busy}>Hủy</button>
            <button type="submit" className="btn-modal-submit" disabled={busy}>
              {stage === "saving" ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
