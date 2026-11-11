import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getPostDetail, type PostDetailResponse } from "../../api/postApi";
import { useAuthStore } from "../../store/authStore";
import { CommentSection } from "../../components/classroom/CommentSection";
import { AttachmentPreview } from "../../components/classroom/AttachmentPreview";
import "./PostDetailPage.css";

export function PostDetailPage({ classId: givenClassId, postId: givenPostId, portal }:
  { classId?: number; postId?: number; portal: "student" | "moderator" }) {
  const params = useParams();
  const classId = givenClassId ?? Number(params.classId);
  const postId = givenPostId ?? Number(params.postId);
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [detail, setDetail] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    const result = await getPostDetail(classId, postId);
    setDetail(result);
  }, [classId, postId]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    if (!Number.isSafeInteger(classId) || classId <= 0 || !Number.isSafeInteger(postId) || postId <= 0) {
      setError("Đường dẫn bài đăng không hợp lệ."); setLoading(false); return;
    }
    getPostDetail(classId, postId)
      .then(result => {
        if (!active) return;
        setDetail(result);
      })
      .catch(cause => {
        if (!active) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setError(status === 404 ? "Bài đăng không tồn tại." : status === 403 ? "Bạn không có quyền xem bài đăng này."
          : status === 401 ? "Phiên đăng nhập đã hết hạn." : "Không thể tải chi tiết bài đăng.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, postId, portal, version]);

  const back = portal === "moderator" ? `/moderator/classes/${classId}/posts` : `/classes/${classId}/posts`;
  return <div className="post-detail-page post-detail-page--detail">
    <div className="post-detail-toolbar">
      <button type="button" className="post-detail-back" onClick={() => navigate(back)}>← <span>Quay lại danh sách</span></button>
      <span className="post-detail-toolbar__label">Chi tiết bài đăng</span>
    </div>
    {loading ? <div className="post-detail-state" role="status">Đang tải bài đăng…</div> : error ? <div className="post-detail-state" role="alert">
      <p>{error}</p><button type="button" onClick={() => setVersion(value => value + 1)}>Thử lại</button>
    </div> : detail && <>
      <header className="post-detail-heading">
        <span className="post-detail-eyebrow">{detail.post.dueAt ? "BÀI TẬP LỚP HỌC" : "BÀI ĐĂNG LỚP HỌC"}</span>
        <h1>{detail.post.title}</h1>
        {detail.post.dueAt && <p className="post-detail-due">◷ Hạn nộp: <time dateTime={detail.post.dueAt}>{new Date(detail.post.dueAt).toLocaleString("vi-VN")}</time></p>}
      </header>
      <article className="post-detail-card">
        <div className="post-detail-author">
          <span className="comment-avatar">{detail.post.authorAvatar ? <img src={detail.post.authorAvatar} alt="" /> : (detail.post.authorName?.[0] || "?")}</span>
          <div><strong>{detail.post.authorName || "Người dùng"}</strong><time dateTime={detail.post.createdAt}>Đăng lúc {new Date(detail.post.createdAt).toLocaleString("vi-VN")}</time></div>
          <span className="post-detail-author__badge">Người đăng</span>
        </div>
        <div className="post-detail-card__body">
          <p className="post-detail-content">{detail.post.content}</p>
          {detail.post.attachmentUrl && <AttachmentPreview url={detail.post.attachmentUrl} />}
        </div>
      </article>
      {detail.readOnly && <p className="post-detail-readonly" role="status">Lớp đã lưu trữ: chỉ có thể xem bình luận.</p>}
      <CommentSection classId={classId} postId={postId} comments={detail.comments} currentUserId={user?.id}
        moderator={portal === "moderator"} readOnly={detail.readOnly} onChanged={refresh} />
    </>}
  </div>;
}
