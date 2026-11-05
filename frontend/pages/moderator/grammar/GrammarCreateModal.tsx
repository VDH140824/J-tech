import axios from "axios";
import { useRef, useState } from "react";
import {
  createGrammar,
  deleteTemporaryGrammarVideo,
  uploadGrammarVideo,
  type GrammarFormInput,
  type GrammarItem,
  type GrammarVideoUpload,
} from "../../../api/grammarApi";

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
    displayOrder: 1,
    status: "DRAFT",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<GrammarVideoUpload | null>(null);
  const temporaryVideoIds = useRef(new Set<string>());
  const [stage, setStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const busy = stage !== "idle";

  const handleCancel = async () => {
    if (busy || closing) return;
    setClosing(true);
    try {
      for (const publicId of temporaryVideoIds.current) {
        await deleteTemporaryGrammarVideo(publicId);
      }
      temporaryVideoIds.current.clear();
      onClose();
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setError(typeof backendMessage === "string" && backendMessage.trim()
        ? backendMessage : "Không xóa được video tạm trên Cloudinary. Vui lòng thử hủy lại.");
    } finally {
      setClosing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (videoError) return;
    if (videoFile && !uploadedVideo) {
      setError("Video chưa tải lên thành công. Vui lòng thử tải lại trước khi tạo ngữ pháp.");
      return;
    }

    const fields = [
      ["Cấu trúc ngữ pháp", form.structureName],
      ["Ý nghĩa tiếng Việt", form.meaningVi],
      ["Giải thích cách dùng", form.usageExplanation],
      ["Ví dụ tiếng Nhật", form.exampleJp],
      ["Dịch ví dụ", form.exampleVi],
    ];
    for (const [label, value] of fields) {
      if (!value.trim()) {
        setError(label + " không được để trống.");
        return;
      }
      if (value.trim().length > 100) {
        setError(label + " không được vượt quá 100 ký tự.");
        return;
      }
    }
    if (form.displayOrder == null || !Number.isInteger(form.displayOrder) || form.displayOrder < 1) {
      setError("Thứ tự hiển thị phải là số nguyên từ 1 trở lên.");
      return;
    }
    setError(null);

    try {
      setStage("saving");

      //transmitting data to grammarApi
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
      temporaryVideoIds.current.clear();
      setUploadedVideo(null);
      onCreated(created);
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setError(typeof backendMessage === "string" && backendMessage.trim()
        ? backendMessage : "Không tạo được ngữ pháp. Dữ liệu đã nhập vẫn được giữ để thử lại.");
    } finally {
      setStage("idle");
    }
  };

  const uploadSelectedVideo = async (file: File) => {
    setStage("uploading");
    setError(null);
    try {
      const uploaded = await uploadGrammarVideo(file);
      temporaryVideoIds.current.add(uploaded.publicId);
      setUploadedVideo(uploaded);
    } catch (caughtError) {
      const apiError = axios.isAxiosError<{ message?: string }>(caughtError) ? caughtError : null;
      const backendMessage = apiError?.response?.data?.message;
      setError(typeof backendMessage === "string" && backendMessage.trim()
        ? backendMessage : "Không tải được video lên Cloudinary. Vui lòng thử lại.");
    } finally {
      setStage("idle");
    }
  };

  const handleVideoChange = (file: File | null) => {
    if (!file) return;
    if (!allowedVideoTypes.has(file.type)) {
      setVideoError("Định dạng video không được hỗ trợ.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setVideoError("Video phải nhỏ hơn 500 MB.");
      return;
    }
    const previousUpload = uploadedVideo;
    setUploadedVideo(null);
    setError(null);
    setVideoError(null);
    setVideoFile(file);
    if (previousUpload?.publicId) {
      void deleteTemporaryGrammarVideo(previousUpload.publicId).then(() => {
        temporaryVideoIds.current.delete(previousUpload.publicId);
      }).catch(() => setError("Không xóa được video đã chọn trước đó trên Cloudinary; video sẽ được dọn khi hủy form."));
    }
    void uploadSelectedVideo(file);
  };

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="grammar-create-title" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h3 className="modal-title" id="grammar-create-title">Thêm ngữ pháp mới</h3>
          <button type="button" className="modal-btn-close" onClick={() => void handleCancel()} disabled={busy || closing} aria-label="Đóng">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form-body">
          <p className="modal-description">Các trường nội dung bắt buộc, tối đa 100 ký tự mỗi trường.</p>
          <div className="modal-grid-2">
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-structure">Cấu trúc ngữ pháp *</label>
              <input id="grammar-structure" className="modal-input" required value={form.structureName} onChange={(e) => setForm({ ...form, structureName: e.target.value })} />
            </div>
            <div className="modal-field-group">
              <label className="modal-label" htmlFor="grammar-meaning">Ý nghĩa tiếng Việt *</label>
              <input id="grammar-meaning" className="modal-input" required value={form.meaningVi} onChange={(e) => setForm({ ...form, meaningVi: e.target.value })} />
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
              <input id="grammar-order" className="modal-input" type="number" min="1" required value={form.displayOrder ?? 1} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
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
            <button type="button" className="btn-modal-cancel" onClick={() => void handleCancel()} disabled={busy || closing}>{closing ? "Đang dọn video..." : "Hủy"}</button>
            <button type="submit" className="btn-modal-submit" disabled={busy}>
              {stage === "uploading" ? "Đang tải video..." : stage === "saving" ? "Đang tạo ngữ pháp..." : "Tạo ngữ pháp"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
