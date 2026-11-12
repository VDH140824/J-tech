import { useState } from "react";
import axios from "axios";
import { createComment, updateComment, deleteComment, type CommentResponse } from "../../api/commentApi";
import { AttachmentPreview } from "./AttachmentPreview";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const ATTACHMENT_ACCEPT = ".pdf,.docx,.zip,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.ogg,.webm";
const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "zip", "png", "jpg", "jpeg", "mp3", "wav", "m4a", "ogg", "webm"]);
function validateAttachment(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(extension))
    return "Định dạng tệp không được hỗ trợ. Chọn PDF, DOCX, ZIP, PNG, JPG, MP3, WAV, M4A, OGG hoặc WebM.";
  if (file.size === 0) return "Tệp đính kèm không có dữ liệu.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "Tệp vượt quá dung lượng cho phép (tối đa 15MB).";
  return "";
}

function message(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message || "Không thể xử lý bình luận. Vui lòng thử lại.";
  return "Không thể xử lý bình luận. Vui lòng thử lại.";
}

function RichText({ content }: { content: string }) {
  return <>{content.split(/(https?:\/\/[^\s]+)/gi).map((part, index) => {
    if (!/^https?:\/\//i.test(part)) return <span key={index}>{part}</span>;
    try {
      const url = new URL(part);
      return ["http:", "https:"].includes(url.protocol)
        ? <a key={index} href={url.href} target="_blank" rel="noopener noreferrer">{part}</a>
        : <span key={index}>{part}</span>;
    } catch { return <span key={index}>{part}</span>; }
  })}</>;
}

function findCommentById(items: CommentResponse[], id: number): CommentResponse | null {
  for (const comment of items) {
    if (comment.id === id) return comment;
    const reply = findCommentById(comment.replies, id);
    if (reply) return reply;
  }
  return null;
}

export function CommentSection({ classId, postId, comments, currentUserId, moderator, readOnly, onChanged }:
  { classId: number; postId: number; comments: CommentResponse[]; currentUserId?: number; moderator: boolean; readOnly: boolean; onChanged: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [parentId, setParentId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingAttachment, setEditingAttachment] = useState<File | null>(null);
  const [editingRemoveAttachment, setEditingRemoveAttachment] = useState(false);
  const [editingAttachmentError, setEditingAttachmentError] = useState("");
  const [editingError, setEditingError] = useState("");
  const [editingFileInputKey, setEditingFileInputKey] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingError, setDeletingError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    if (!text.trim() && !attachment) { setError("Nội dung bình luận không được để trống"); return; }
    if (attachment) {
      const fileError = validateAttachment(attachment);
      if (fileError) { setAttachmentError(fileError); return; }
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      await createComment(classId, postId, text, parentId, attachment);
      setText(""); setParentId(null); setAttachment(null); setAttachmentError("");
      setFileInputKey(value => value + 1);
      await onChanged();
      setSuccess("Gửi thành công!");
    } catch (cause) {
      const failure = message(cause);
      if (attachment && /tệp|cloudinary/i.test(failure)) setAttachmentError(failure);
      else setError(failure);
    }
    finally { setBusy(false); }
  }
  function openEdit(comment: CommentResponse) {
    setEditingId(comment.id);
    setEditingText(comment.content || "");
    setEditingAttachment(null);
    setEditingRemoveAttachment(false);
    setEditingAttachmentError("");
    setEditingError("");
    setEditingFileInputKey(value => value + 1);
    setError("");
    setSuccess("");
  }
  function closeEdit() {
    setEditingId(null);
    setEditingAttachment(null);
    setEditingRemoveAttachment(false);
    setEditingAttachmentError("");
    setEditingError("");
  }
  async function saveEdit(comment: CommentResponse) {
    if (editingId !== comment.id) return;
    const hasAttachment = !!editingAttachment || (!!comment.attachmentUrl && !editingRemoveAttachment);
    if (!editingText.trim() && !hasAttachment) {
      setEditingError("Nội dung bình luận không được để trống"); return;
    }
    if (editingAttachment) {
      const fileError = validateAttachment(editingAttachment);
      if (fileError) { setEditingAttachmentError(fileError); return; }
    }
    setBusy(true); setEditingError(""); setEditingAttachmentError(""); setSuccess("");
    try {
      await updateComment(classId, postId, comment.id, editingText, editingRemoveAttachment, editingAttachment);
      closeEdit();
      try { await onChanged(); setSuccess("Cập nhật thành công!"); }
      catch { setError("Bình luận đã được cập nhật nhưng không thể tải lại danh sách. Vui lòng tải lại trang."); }
    } catch (cause) {
      const failure = message(cause);
      if (editingAttachment && /tệp|cloudinary/i.test(failure)) setEditingAttachmentError(failure);
      else setEditingError(failure);
    }
    finally { setBusy(false); }
  }
  async function confirmDelete() {
    if (deletingId == null) return;
    setBusy(true); setDeletingError(""); setSuccess("");
    try {
      await deleteComment(classId, postId, deletingId);
      setDeletingId(null);
      try { await onChanged(); setSuccess("Đã xóa thành công!"); }
      catch { setError("Bình luận đã được xóa nhưng không thể tải lại danh sách. Vui lòng tải lại trang."); }
    } catch (cause) { setDeletingError(message(cause)); }
    finally { setBusy(false); }
  }

  function item(comment: CommentResponse): React.ReactNode {
    const own = comment.userId === currentUserId;
    return <li key={comment.id} className="comment-item">
      <div className="comment-header">
        <span className="comment-avatar">{comment.commenterAvatar ? <img src={comment.commenterAvatar} alt="" /> : (comment.commenterName?.[0] || "?")}</span>
        <div className="comment-header__details"><strong>{comment.commenterName || "Người dùng"}</strong>
          <div className="comment-header__meta"><time dateTime={comment.updatedAt || comment.createdAt}>{new Date(comment.updatedAt || comment.createdAt).toLocaleString("vi-VN")}</time>
            {comment.updatedAt && <span>(Đã chỉnh sửa)</span>}</div>
        </div>
      </div>
      {editingId === comment.id ?
        <div className="comment-form comment-form--edit">
          <label className="comment-form__label" htmlFor={`edit-comment-${comment.id}`}>Chỉnh sửa bình luận</label>
          <textarea id={`edit-comment-${comment.id}`} maxLength={200} value={editingText} onChange={event => {
            setEditingText(event.target.value); setEditingError("");
          }} />
          {comment.attachmentUrl && !editingRemoveAttachment && <div className="comment-edit-current">
            <span>Tệp hiện tại{editingAttachment ? " · sẽ được thay thế" : ""}</span>
            <AttachmentPreview url={comment.attachmentUrl} audioOnlyVideo />
          </div>}
          {comment.attachmentUrl && editingRemoveAttachment && <p className="comment-edit-removed">Tệp hiện tại sẽ được gỡ khi lưu.</p>}
          <div className={`comment-attachment comment-edit-attachment${editingAttachmentError ? " comment-attachment-error" : ""}`}>
            <label className="comment-attachment__picker" htmlFor={`edit-comment-file-${comment.id}`}>▤ Chọn tệp mới</label>
            <input key={editingFileInputKey} id={`edit-comment-file-${comment.id}`} type="file" accept={ATTACHMENT_ACCEPT}
              disabled={busy} onChange={event => {
                const file = event.target.files?.[0] || null;
                setEditingAttachment(file);
                if (file) setEditingRemoveAttachment(false);
                setEditingAttachmentError(file ? validateAttachment(file) : "");
                setEditingError("");
              }} />
            {editingAttachment && <button type="button" className="comment-attachment__selected" disabled={busy} onClick={() => {
              setEditingAttachment(null); setEditingAttachmentError(""); setEditingFileInputKey(value => value + 1);
            }} title="Bỏ tệp mới đã chọn">{editingAttachment.name} ×</button>}
            {comment.attachmentUrl && <button type="button" className="comment-edit-remove" disabled={busy} onClick={() => {
              setEditingRemoveAttachment(value => !value); setEditingAttachment(null);
              setEditingAttachmentError(""); setEditingError(""); setEditingFileInputKey(value => value + 1);
            }}>{editingRemoveAttachment ? "Hoàn tác gỡ tệp" : "Gỡ tệp hiện tại"}</button>}
          </div>
          {editingAttachmentError && <p role="alert" className="comment-error">{editingAttachmentError}</p>}
          {editingError && <p role="alert" className="comment-error">{editingError}</p>}
          <div className="comment-form__actions"><button type="button" className="comment-primary-button" disabled={busy} onClick={() => saveEdit(comment)}>{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
            <button type="button" disabled={busy} onClick={closeEdit}>Hủy</button></div>
        </div> :
        <><p className="comment-body"><RichText content={comment.content || ""} /></p>
          {comment.attachmentUrl && <AttachmentPreview url={comment.attachmentUrl} audioOnlyVideo />}
          {!readOnly && <div className="comment-actions">
            <button type="button" disabled={busy} onClick={() => { setParentId(comment.id); setError(""); }}>↩ Trả lời</button>
            {own && <button type="button" disabled={busy} onClick={() => openEdit(comment)}>Chỉnh sửa</button>}
            {(own || moderator) && <button type="button" disabled={busy} onClick={() => { setDeletingId(comment.id); setDeletingError(""); setError(""); }}>Xóa</button>}
          </div>}</>}
      {comment.replies.length > 0 && <ul className="comment-replies">{comment.replies.map(item)}</ul>}
    </li>;
  }

  function visibleComments(items: CommentResponse[]): CommentResponse[] {
    return items.flatMap(comment => {
      const replies = visibleComments(comment.replies);
      return comment.deleted ? replies : [{ ...comment, replies }];
    });
  }
  const visible = visibleComments(comments);
  const replyTarget = parentId == null ? null : findCommentById(visible, parentId);
  const replyTargetContent = replyTarget?.content?.trim()
    || (replyTarget?.attachmentUrl ? "Bình luận có tệp đính kèm" : "Bình luận không còn khả dụng");
  const count = (items: CommentResponse[]): number => items.reduce((sum, comment) => sum + 1 + count(comment.replies), 0);
  return <section className="comment-section" aria-label="Bình luận">
    <div className="comment-section__heading"><div><span className="post-detail-eyebrow">THẢO LUẬN</span>
      <h2>Bình luận <span>({count(visible)})</span></h2></div>
      <p>Chia sẻ ý kiến của bạn về bài đăng này.</p>
    </div>
    {!readOnly && <div className="comment-form comment-form--create">
      {parentId != null && <div className="comment-reply-target">
        <span>Đang trả lời:</span>
        <button type="button" onClick={() => setParentId(null)}>Hủy trả lời</button>
        <span className="comment-reply-target__content">{replyTargetContent}</span>
      </div>}
      <label className="comment-form__label" htmlFor={`comment-text-${postId}`}>Nội dung bình luận</label>
      <textarea id={`comment-text-${postId}`} placeholder="Viết nội dung..." maxLength={200} value={text} onChange={event => setText(event.target.value)} />
      <div className="comment-form__footer">
      <div className={`comment-attachment${attachmentError ? " comment-attachment-error" : ""}`}>
        <label htmlFor={`comment-file-${postId}`} className="comment-attachment__picker">▤ Đính kèm tệp</label>
        <input key={fileInputKey} id={`comment-file-${postId}`} type="file" accept={ATTACHMENT_ACCEPT}
          disabled={busy} onChange={event => {
            const file = event.target.files?.[0] || null;
            setAttachment(file);
            setAttachmentError(file ? validateAttachment(file) : "");
          }} />
        {attachment && <button type="button" className="comment-attachment__selected" disabled={busy} onClick={() => {
          setAttachment(null); setAttachmentError(""); setFileInputKey(value => value + 1);
        }} title="Bỏ tệp đã chọn">{attachment.name} ×</button>}
      </div>
      <button type="button" className="comment-primary-button" disabled={busy} onClick={submit}>{busy ? "Đang gửi…" : "Gửi bình luận"}</button>
      </div>
      {attachmentError && <p role="alert" className="comment-error">{attachmentError}</p>}
    </div>}
    {error && <p role="alert" className="comment-error">{error}</p>}
    {success && <p role="status" className="comment-success">{success}</p>}
    {visible.length ? <ul className="comment-list">{visible.map(item)}</ul> : <p className="comment-empty">Chưa có bình luận nào. Hãy bắt đầu cuộc thảo luận.</p>}
    {deletingId != null && <div className="comment-confirm-backdrop" role="presentation"><div role="alertdialog" aria-modal="true" aria-labelledby="comment-delete-title" className="comment-confirm">
      <h3 id="comment-delete-title">Xóa bình luận</h3><p>Bạn có chắc chắn muốn xóa bình luận này không?</p>
      {deletingError && <p role="alert" className="comment-error">{deletingError}</p>}
      <button type="button" disabled={busy} onClick={() => { setDeletingId(null); setDeletingError(""); }}>Hủy bỏ</button>
      <button type="button" disabled={busy} onClick={confirmDelete}>{busy ? "Đang xóa…" : "Xác nhận"}</button>
    </div></div>}
  </section>;
}
