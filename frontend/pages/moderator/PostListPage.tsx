import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getMyClasses, type ClassResponse } from "../../api/classApi";
import { deletePost, getPostsByClass, type PostResponse } from "../../api/postApi";
import { CreatePostModal } from "./CreatePostModal";
import { EditPostModal } from "./EditPostModal";
import "./PostListPage.css";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  hour12: false,
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

interface PostListPageProps {
  classId: number;
}

export function PostListPage({ classId }: PostListPageProps) {
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<ClassResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [postToEdit, setPostToEdit] = useState<PostResponse | null>(null);
  const [postToDelete, setPostToDelete] = useState<PostResponse | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleting = useRef(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (postToDelete) deleteDialog.current?.showModal();
  }, [postToDelete]);

  function closeDeleteConfirmation() {
    if (!deleting.current) setPostToDelete(null);
  }

  async function confirmDelete() {
    if (!postToDelete || deleting.current) return;
    deleting.current = true;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deletePost(classId, postToDelete.id);
      setPostToDelete(null);
      setSuccess("Xóa bài đăng thành công.");
      setRequestVersion((value) => value + 1);
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      setDeleteError(status === 404 ? "Bài đăng không tồn tại."
        : status === 403 ? "Bạn không có quyền xóa bài đăng này."
          : "Không thể xóa bài đăng. Vui lòng thử lại.");
    } finally {
      deleting.current = false;
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getMyClasses(), getPostsByClass(classId)])
      .then(([classes, classPosts]) => {
        if (!active) return;
        const selected = classes.find((item) => item.id === classId);
        if (!selected) {
          setError("Không tìm thấy lớp học hoặc bạn không có quyền truy cập.");
          setCanRetry(false);
          return;
        }
        setClassroom(selected);
        setPosts(classPosts);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setCanRetry(status !== 401 && status !== 403 && status !== 404);
        setError(status === 403 ? "Bạn không có quyền xem bài đăng của lớp này hoặc lớp không hoạt động."
          : status === 404 ? "Lớp học không tồn tại."
            : status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
              : "Không thể tải danh sách bài đăng.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, requestVersion]);

  const isArchived = classroom?.status === "ARCHIVED";

  return (
    <section className="post-list-page" aria-label="Danh sách bài đăng lớp học">
      <header className="post-list-heading">
        <div>
          <h2>{classroom ? `Lớp ${classroom.code}` : "Bài đăng lớp học"}</h2>
          <p>Trang chủ / Quản lý lớp học{classroom ? ` / Lớp ${classroom.code}` : ""}</p>
        </div>
        <div className="post-list-header-actions">
          {!isArchived && <button type="button" className="post-list-create" disabled={!classroom || !!error || loading}
            onClick={() => { setSuccess(""); setShowCreate(true); }}>+ Tạo bài đăng</button>}
          <button type="button" onClick={() => navigate("/moderator/classes")}>Danh sách lớp</button>
        </div>
      </header>

      {showCreate && classroom && !isArchived && <CreatePostModal classroom={classroom}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          setSuccess("Tạo bài đăng thành công.");
          setRequestVersion((value) => value + 1);
        }} />}
      {postToEdit && classroom && !isArchived && <EditPostModal key={postToEdit.id} classroom={classroom} post={postToEdit}
        onClose={() => setPostToEdit(null)}
        onUpdated={() => {
          setPostToEdit(null);
          setSuccess("Cập nhật bài đăng thành công.");
          setRequestVersion((value) => value + 1);
        }} />}
      {postToDelete && !isArchived && (
        <dialog ref={deleteDialog} className="post-delete-dialog" aria-labelledby="post-delete-title"
          onCancel={(event) => { event.preventDefault(); closeDeleteConfirmation(); }}>
          <div className="post-delete-heading">
            <h2 id="post-delete-title">Xóa bài đăng</h2>
            <button type="button" aria-label="Đóng xác nhận xóa" disabled={deleteBusy}
              onClick={closeDeleteConfirmation}>×</button>
          </div>
          <p>Bạn có chắc chắn muốn xóa bài <strong>{postToDelete.title}</strong>?</p>
          <p className="post-delete-note">Tất cả bình luận và tệp đính kèm của bài này cũng sẽ bị xóa.</p>
          {deleteError && <p className="post-delete-error" role="alert">{deleteError}</p>}
          <div className="post-delete-actions">
            <button type="button" disabled={deleteBusy} onClick={closeDeleteConfirmation}>Hủy</button>
            <button type="button" className="post-delete-confirm" disabled={deleteBusy} onClick={confirmDelete}>
              {deleteBusy ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
          </div>
        </dialog>
      )}
      {success && <p className="post-list-success" role="status">{success}</p>}

      {loading ? (
        <div className="post-list-state" role="status">Đang tải danh sách bài đăng…</div>
      ) : error ? (
        <div className="post-list-state post-list-error" role="alert">
          <p>{error}</p>
          {canRetry && <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>Thử lại</button>}
        </div>
      ) : classroom && (
        <>
          <div className="post-list-class-summary">
            <span className={`post-list-status${isArchived ? " post-list-status-archived" : ""}`}>
              {isArchived ? "Lưu trữ" : "Đang hoạt động"}
            </span>
            <h3>{classroom.code}</h3>
            {classroom.description && <p>{classroom.description}</p>}
            <p>Học sinh: {classroom.studentCount} học viên</p>
          </div>

          {isArchived && <p className="post-list-readonly" role="status">Lớp đã lưu trữ: bạn chỉ có thể xem bài đăng.</p>}

          {posts.length === 0 ? (
            <div className="post-list-state" role="status">Chưa có bài đăng nào</div>
          ) : (
            <div className="post-list-items">
              {posts.map((post) => (
                <article className="post-list-card" key={post.id}>
                  <div className="post-list-avatar" aria-hidden="true">
                    {post.authorAvatar ? <img src={post.authorAvatar} alt="" /> : <span>●</span>}
                  </div>
                  <div className="post-list-card-main">
                    <div className="post-list-card-top">
                      <div>
                        <div className="post-list-author">{post.authorName || "Người dùng"}</div>
                        <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                      </div>
                      <div className="post-list-actions">
                        <button type="button" disabled title="Chức năng xem chi tiết bài đăng chưa hỗ trợ">Xem chi tiết</button>
                        {!isArchived && <>
                          <button type="button" onClick={() => { setSuccess(""); setPostToEdit(post); }}>✎ Chỉnh sửa</button>
                          <button type="button" onClick={() => {
                            setSuccess("");
                            setDeleteError("");
                            setPostToDelete(post);
                          }}>× Xóa</button>
                        </>}
                      </div>
                    </div>
                    <div className="post-list-title-row">
                      <h4>{post.title}</h4>
                      <span className="post-list-kind">{post.dueAt ? "Bài tập thực hành" : "Bài đăng"}</span>
                    </div>
                    <p className="post-list-content">{post.content}</p>
                    {post.attachmentUrl && (
                      <div className="post-list-attachment">
                        <span>▤ Tài liệu đính kèm</span>
                        <a href={post.attachmentUrl} target="_blank" rel="noopener noreferrer">Tải xuống</a>
                      </div>
                    )}
                    {post.dueAt && <p className="post-list-due">Hạn nộp: {formatDate(post.dueAt)}</p>}
                    <div className="post-list-comments">{post.commentCount} bình luận</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
