import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { getEnrolledClasses, type ClassResponse } from "../../api/classApi";
import { getPostsByClass, type PostResponse } from "../../api/postApi";
import { attachmentDownloadUrl } from "../../utils/classroomAttachment";
import "../moderator/PostListPage.css";
import "./StudentClassPages.css";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function StudentPostListPage() {
  const navigate = useNavigate();
  const { classId: classIdParam } = useParams();
  const classId = Number(classIdParam);
  const [classroom, setClassroom] = useState<ClassResponse | null>(null);
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setClassroom(null);
    setPosts([]);
    setCanRetry(true);
    if (!Number.isSafeInteger(classId) || classId <= 0) {
      setError("Đường dẫn lớp học không hợp lệ.");
      setCanRetry(false);
      setLoading(false);
      return;
    }
    Promise.all([getEnrolledClasses(), getPostsByClass(classId)])
      .then(([classes, classPosts]) => {
        if (!active) return;
        const selected = classes.find(item => item.id === classId);
        if (!selected) {
          setError("Không tìm thấy lớp học hoặc bạn không có quyền truy cập.");
          setCanRetry(false);
          return;
        }
        setClassroom(selected);
        setPosts(classPosts);
      })
      .catch(cause => {
        if (!active) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setCanRetry(status !== 401 && status !== 403 && status !== 404);
        setError(status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : status === 403 ? "Bạn không có quyền xem bài đăng của lớp này."
            : status === 404 ? "Lớp học không tồn tại."
              : "Không thể tải danh sách bài đăng.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, requestVersion]);

  const isArchived = classroom?.status === "ARCHIVED";

  return <section className="post-list-page student-class-page" aria-label="Danh sách bài đăng lớp học">
    <button type="button" className="post-list-back" onClick={() => navigate("/classes")}>← Trở lại</button>
    <header className="post-list-heading">
      <div>
        <h2>{classroom ? `Lớp ${classroom.code}` : "Bài đăng lớp học"}</h2>
        <p>Trang chủ / Lớp học của tôi{classroom ? ` / Lớp ${classroom.code}` : ""}</p>
      </div>
    </header>

    {loading ? <div className="post-list-state" role="status">Đang tải danh sách bài đăng…</div>
      : error ? <div className="post-list-state post-list-error" role="alert">
        <p>{error}</p>
        {canRetry && <button type="button" onClick={() => setRequestVersion(value => value + 1)}>Thử lại</button>}
      </div> : classroom && <>
        <div className="post-list-class-summary">
          <span className={`post-list-status${isArchived ? " post-list-status-archived" : ""}`}>
            {isArchived ? "Lưu trữ" : "Đang hoạt động"}
          </span>
          <h3>{classroom.code}</h3>
          {classroom.description && <p>{classroom.description}</p>}
          <p>Học sinh: {classroom.studentCount} học viên</p>
        </div>
        {isArchived && <p className="post-list-readonly" role="status">Lớp đã lưu trữ: bạn chỉ có thể xem bài đăng.</p>}
        {posts.length === 0 ? <div className="post-list-state" role="status">Chưa có bài đăng nào</div>
          : <div className="post-list-items">
            {posts.map(post => <article className="post-list-card" key={post.id}>
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
                    <button type="button" onClick={() => navigate(`/classes/${classId}/posts/${post.id}`)}>Xem chi tiết</button>
                  </div>
                </div>
                <div className="post-list-title-row">
                  <h4>{post.title}</h4>
                  <span className="post-list-kind">{post.dueAt ? "Bài tập thực hành" : "Bài đăng"}</span>
                </div>
                <p className="post-list-content">{post.content}</p>
                {post.attachmentUrl && <div className="post-list-attachment">
                  <span>▤ Tài liệu đính kèm</span>
                  <a href={attachmentDownloadUrl(post.attachmentUrl)} target="_blank" rel="noopener noreferrer">Tải xuống</a>
                </div>}
                {post.dueAt && <p className="post-list-due">Hạn nộp: {formatDate(post.dueAt)}</p>}
                <div className="post-list-comments">{post.commentCount} bình luận</div>
              </div>
            </article>)}
          </div>}
      </>}
  </section>;
}
