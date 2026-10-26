import { useState } from "react";
import {
  createGrammar,
  uploadGrammarVideo,
  type GrammarFormInput,
  type GrammarItem,
  type GrammarVideoUpload,
} from "../../api/grammarApi";

interface GrammarCreateModalProps {
  lessonId: number;
  onClose: () => void;
  onCreated: (grammar: GrammarItem) => void;
}

const allowedVideoTypes = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska",
]);

export function GrammarCreateModal({ lessonId, onClose, onCreated }: GrammarCreateModalProps) {
  const [form, setForm] = useState<GrammarFormInput>({
    structureName: "",
    meaningVi: "",
    usageExplanation: "",
    exampleJp: "",
    exampleVi: "",
    displayOrder: 0,
    status: "DRAFT",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<GrammarVideoUpload | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const busy = stage !== "idle";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (videoError) return;
    if (videoFile && !uploadedVideo) {
      setError("Video chưa tải lên thành công. Vui lòng thử tải lại trước khi tạo ngữ pháp.");
      return;
    }

    const fields = [form.structureName, form.meaningVi, form.usageExplanation, form.exampleJp, form.exampleVi];
    if (fields.some((value) => !value.trim())) {
      setError("Vui lòng nhập đầy đủ các trường ngữ pháp bắt buộc.");
      return;
    }
    setError(null);

    try {
      setStage("saving");
      const created = await createGrammar(lessonId, {
        ...form,
        structureName: form.structureName.trim(),
        meaningVi: form.meaningVi.trim(),
        usageExplanation: form.usageExplanation.trim(),
        exampleJp: form.exampleJp.trim(),
        exampleVi: form.exampleVi.trim(),
        videoUrl: uploadedVideo?.videoUrl,
        videoPublicId: uploadedVideo?.publicId,
        videoDurationSec: uploadedVideo?.duration == null ? undefined : Math.ceil(uploadedVideo.duration),
      });
      onCreated(created);
    } catch {
      setError("Không tạo được ngữ pháp. Dữ liệu đã nhập vẫn được giữ để thử lại.");
    } finally {
      setStage("idle");
    }
  };

  const uploadSelectedVideo = async (file: File) => {
    setStage("uploading");
    setError(null);
    try {
      setUploadedVideo(await uploadGrammarVideo(file));
    } catch {
      setError("Không tải được video lên Cloudinary. Vui lòng thử lại.");
    } finally {
      setStage("idle");
    }
  };

  const handleVideoChange = (file: File | null) => {
    setUploadedVideo(null);
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
    void uploadSelectedVideo(file);
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="grammar-create-title" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title" id="grammar-create-title">Thêm ngữ pháp mới</h3>
          <button type="button" className="modal-btn-close" onClick={onClose} disabled={busy} aria-label="Đóng">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form-body">
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-structure">Cấu trúc ngữ pháp *</label>
              <input id="grammar-structure" className="modal-input" required maxLength={150} value={form.structureName} onChange={(e) => setForm({ ...form, structureName: e.target.value })} />
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-meaning">Ý nghĩa tiếng Việt *</label>
              <input id="grammar-meaning" className="modal-input" required maxLength={255} value={form.meaningVi} onChange={(e) => setForm({ ...form, meaningVi: e.target.value })} />
            </div>
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-usage">Giải thích cách dùng *</label>
            <textarea id="grammar-usage" className="modal-textarea" required rows={4} value={form.usageExplanation} onChange={(e) => setForm({ ...form, usageExplanation: e.target.value })} />
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-example-jp">Ví dụ tiếng Nhật *</label>
            <textarea id="grammar-example-jp" className="modal-textarea" required rows={2} value={form.exampleJp} onChange={(e) => setForm({ ...form, exampleJp: e.target.value })} />
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-example-vi">Dịch ví dụ tiếng Việt *</label>
            <textarea id="grammar-example-vi" className="modal-textarea" required rows={2} value={form.exampleVi} onChange={(e) => setForm({ ...form, exampleVi: e.target.value })} />
          </div>
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-order">Thứ tự hiển thị</label>
              <input id="grammar-order" className="modal-input" type="number" min="0" required value={form.displayOrder ?? 0} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-status">Trạng thái</label>
              <select id="grammar-status" className="modal-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as GrammarFormInput["status"] })}>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã xuất bản</option>
                <option value="HIDDEN">Ẩn</option>
              </select>
            </div>
          </div>
          <div className="modal-field-group">
            <label className="modal-label" htmlFor="grammar-video">Video từ thiết bị (tùy chọn)</label>
            <input id="grammar-video" type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska" onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)} disabled={busy} />
            {videoFile && <p style={{ color: "#64748b" }}>{videoFile.name} · {stage === "uploading" ? "Đang tải lên Cloudinary..." : uploadedVideo ? "Đã tải lên Jtech/Moderator/Grammar/video." : "Chưa tải lên thành công."}</p>}
            {videoFile && !uploadedVideo && !busy && (
              <button type="button" className="btn-modal-cancel" onClick={() => void uploadSelectedVideo(videoFile)}>
                Thử tải lại video
              </button>
            )}
          </div>
          {(videoError || error) && <p role="alert" style={{ color: "#b91c1c" }}>{videoError || error}</p>}
          <div className="modal-actions-row">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={busy}>Hủy</button>
            <button type="submit" className="btn-modal-submit" disabled={busy}>
              {stage === "uploading" ? "Đang tải video..." : stage === "saving" ? "Đang tạo ngữ pháp..." : "Tạo ngữ pháp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
