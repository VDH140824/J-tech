import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import type { ClassResponse } from "../../api/classApi";
import { updatePost, type CreatePostRequest, type PostResponse } from "../../api/postApi";
import "./CreatePostModal.css";
import "./EditPostModal.css";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "mp3", "wav", "m4a", "ogg", "mp4", "webm", "mov"];
const AUDIO_EXTENSION = /\.(mp3|wav|m4a|ogg|webm)(?:[?#]|$)/i;

function currentMinuteLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface EditPostModalProps {
  classroom: ClassResponse;
  post: PostResponse;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditPostModal({ classroom, post, onClose, onUpdated }: EditPostModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const originalDueAt = post.dueAt?.slice(0, 16) ?? "";
  const [postType, setPostType] = useState<CreatePostRequest["postType"] | "">(originalDueAt ? "ASSIGNMENT" : "");
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [dueAt, setDueAt] = useState(originalDueAt);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [minDueAt, setMinDueAt] = useState(currentMinuteLocal);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setMinDueAt(currentMinuteLocal()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!attachment) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(attachment);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  function chooseFile(file: File | undefined) {
    if (!file) { setAttachment(null); return; }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(extension) || file.size === 0 || file.size > MAX_FILE_BYTES) {
      setAttachment(null);
      if (fileInput.current) fileInput.current.value = "";
      setError("Tệp phải là PDF, audio hoặc video hợp lệ và không quá 25 MB.");
      return;
    }
    setAttachment(file);
    setError("");
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) return setError("Nội dung * là bắt buộc, không được để trống.");
    if (trimmedTitle.length > 200) return setError("Tiêu đề không được vượt quá 200 ký tự.");
    if (!postType) return setError("Vui lòng chọn loại bài đăng.");
    if (postType === "ASSIGNMENT" && dueAt && dueAt !== originalDueAt && dueAt < currentMinuteLocal()) {
      return setError("Hạn nộp không được trước thời điểm hiện tại.");
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await updatePost(classroom.id, post.id, {
        postType, title: trimmedTitle, content: trimmedContent,
        dueAt: postType === "ASSIGNMENT" && dueAt ? dueAt : null,
      }, attachment);
      onUpdated();
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined;
      setError(status === 404 ? "Bài đăng không tồn tại."
        : status === 403 ? "Bạn không có quyền chỉnh sửa bài đăng này."
          : (status === 400 || status === 409) && typeof message === "string" ? message
            : typeof message === "string" && message.includes("Lỗi lưu tài liệu")
              ? "Lỗi lưu tài liệu, vui lòng thử lại."
              : "Lưu thất bại, vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const shownUrl = previewUrl ?? post.attachmentUrl;
  const shownName = attachment?.name ?? "Tệp đính kèm hiện tại";
  const isAudio = attachment ? AUDIO_EXTENSION.test(attachment.name)
    : !!post.attachmentUrl && AUDIO_EXTENSION.test(post.attachmentUrl);

  return (
    <dialog ref={dialog} className="create-post-modal edit-post-modal" aria-labelledby="edit-post-title"
      onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
      <form onSubmit={submitForm} noValidate>
        <div className="create-post-modal-heading">
          <h2 id="edit-post-title">Chỉnh sửa bài đăng</h2>
          <button type="button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}>×</button>
        </div>
        <label htmlFor="edit-post-class">Lớp học </label>
        <input id="edit-post-class" value={classroom.code} readOnly />

        <fieldset>
          <legend>Loại bài đăng *</legend>
          <label><input type="radio" name="edit-post-type" checked={postType === "ASSIGNMENT"} disabled={busy}
            onChange={() => setPostType("ASSIGNMENT")} /> Giao bài tập</label>
          <label><input type="radio" name="edit-post-type" checked={postType === "ANNOUNCEMENT"} disabled={busy}
            onChange={() => { setPostType("ANNOUNCEMENT"); setDueAt(""); }} /> Thông báo lớp</label>
        </fieldset>
        {!post.dueAt && <p className="edit-post-type-note">Bài đăng này không lưu loại bài; vui lòng chọn loại trước khi lưu.</p>}

        <label htmlFor="edit-post-title-input">Tiêu đề bài đăng / Tên bài tập *</label>
        <input id="edit-post-title-input" autoFocus value={title} disabled={busy} maxLength={200}
          onChange={(event) => setTitle(event.target.value)} />

        <label htmlFor="edit-post-content">Nội dung hướng dẫn chi tiết *</label>
        <textarea id="edit-post-content" rows={4} value={content} disabled={busy}
          onChange={(event) => setContent(event.target.value)} />

        <label htmlFor="edit-post-file">Tệp đính kèm (tùy chọn)</label>
        <div className="create-post-file-picker edit-post-file-picker">
          <div className="edit-post-file-current">
            <span>{shownUrl ? shownName : "Chưa có tệp đính kèm"}</span>
            {shownUrl && isAudio && <audio controls preload="none" src={shownUrl} aria-label="Nghe tệp audio đính kèm" />}
            {shownUrl && !isAudio && <a href={shownUrl} target="_blank" rel="noopener noreferrer">Xem tệp</a>}
          </div>
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>Chọn tệp</button>
          <input ref={fileInput} id="edit-post-file" type="file" disabled={busy}
            accept=".pdf,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov" aria-label="Chọn tệp thay thế"
            onChange={(event) => chooseFile(event.target.files?.[0])} />
        </div>

        {postType === "ASSIGNMENT" && (
          <>
            <label htmlFor="edit-post-due">Thời hạn nộp (chỉ dành cho bài tập)</label>
            <input id="edit-post-due" type="datetime-local" value={dueAt}
              min={minDueAt}
              disabled={busy} onChange={(event) => setDueAt(event.target.value)} />
          </>
        )}

        {error && <p className="create-post-error" role="alert">{error}</p>}
        <div className="create-post-buttons">
          <button type="button" disabled={busy} onClick={onClose}>Hủy bỏ</button>
          <button type="submit" className="create-post-submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button>
        </div>
      </form>
    </dialog>
  );
}
