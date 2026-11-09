import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import { createPost, type CreatePostRequest } from "../../api/postApi";
import type { ClassResponse } from "../../api/classApi";
import "./CreatePostModal.css";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "mp3", "wav", "m4a", "ogg", "mp4", "webm", "mov"];

function currentMinuteLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface CreatePostModalProps {
  classroom: ClassResponse;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePostModal({ classroom, onClose, onCreated }: CreatePostModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [postType, setPostType] = useState<CreatePostRequest["postType"]>("ASSIGNMENT");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [minDueAt, setMinDueAt] = useState(currentMinuteLocal);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setMinDueAt(currentMinuteLocal()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
    if (!trimmedTitle || !trimmedContent) {
      setError("Nội dung * là bắt buộc, không được để trống.");
      return;
    }
    if (trimmedTitle.length > 200) {
      setError("Tiêu đề không được vượt quá 200 ký tự.");
      return;
    }
    if (postType === "ASSIGNMENT" && dueAt && dueAt < currentMinuteLocal()) {
      setError("Hạn nộp không được trước thời điểm hiện tại.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await createPost(classroom.id, {
        postType,
        title: trimmedTitle,
        content: trimmedContent,
        dueAt: postType === "ASSIGNMENT" && dueAt ? dueAt : null,
      }, attachment);
      onCreated();
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined;
      setError((status === 400 || status === 409) && typeof message === "string"
        ? message : typeof message === "string" && message.includes("Lỗi lưu tài liệu")
          ? "Lỗi lưu tài liệu, vui lòng thử lại."
          : "Lưu thất bại, vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} className="create-post-modal" aria-labelledby="create-post-title"
      onCancel={(event) => { event.preventDefault(); if (!submitting.current) onClose(); }}>
      <form onSubmit={submitForm} noValidate>
        <div className="create-post-modal-heading">
          <h2 id="create-post-title">Tạo bài đăng mới</h2>
          <button type="button" aria-label="Đóng hộp thoại" disabled={busy} onClick={onClose}>×</button>
        </div>
        <label htmlFor="create-post-class">Chọn lớp học phụ trách *</label>
        <input id="create-post-class" value={classroom.code} readOnly />

        <fieldset>
          <legend>Loại bài đăng *</legend>
          <label><input type="radio" name="post-type" checked={postType === "ASSIGNMENT"} disabled={busy}
            onChange={() => setPostType("ASSIGNMENT")} /> Giao bài tập về nhà</label>
          <label><input type="radio" name="post-type" checked={postType === "ANNOUNCEMENT"} disabled={busy}
            onChange={() => { setPostType("ANNOUNCEMENT"); setDueAt(""); }} /> Thông báo lớp</label>
        </fieldset>

        <label htmlFor="create-post-title-input">Tiêu đề bài đăng / Tên bài tập *</label>
        <input id="create-post-title-input" autoFocus value={title} disabled={busy} maxLength={200}
          placeholder="Ví dụ: Bài tập số 1 - Luyện phát âm & Shadowing..."
          onChange={(event) => setTitle(event.target.value)} />

        <label htmlFor="create-post-content">Nội dung hướng dẫn chi tiết *</label>
        <textarea id="create-post-content" rows={4} value={content} disabled={busy}
          placeholder="Nhập hướng dẫn làm bài, nhiệm vụ, mô tả cho học viên..."
          onChange={(event) => setContent(event.target.value)} />

        <label htmlFor="create-post-file">Tệp đính kèm (tùy chọn)</label>
        <div className="create-post-file-picker">
          <span>{attachment ? attachment.name : "⇧  Tải tệp lên từ thiết bị (PDF, Audio, Video...)"}</span>
          <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>Chọn tệp</button>
          <input ref={fileInput} id="create-post-file" type="file" disabled={busy}
            accept=".pdf,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov" aria-label="Chọn tệp đính kèm"
            onChange={(event) => chooseFile(event.target.files?.[0])} />
        </div>

        {postType === "ASSIGNMENT" && (
          <>
            <label htmlFor="create-post-due">Thời hạn nộp (chỉ dành cho bài tập)</label>
            <input id="create-post-due" type="datetime-local" value={dueAt} min={minDueAt} disabled={busy}
              onChange={(event) => setDueAt(event.target.value)} />
          </>
        )}

        {error && <p className="create-post-error" role="alert">{error}</p>}
        <div className="create-post-buttons">
          <button type="button" disabled={busy} onClick={onClose}>Hủy bỏ</button>
          <button type="submit" className="create-post-submit" disabled={busy}>{busy ? "Đang đăng…" : "Đăng bài"}</button>
        </div>
      </form>
    </dialog>
  );
}
