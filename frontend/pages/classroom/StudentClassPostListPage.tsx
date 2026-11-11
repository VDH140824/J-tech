import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getEnrolledClasses, type ClassResponse, type ClassroomStatus } from "../../api/classApi";
import "../moderator/ClassListPage.css";
import "./StudentClassPages.css";

const PAGE_SIZE = 4;
const STATUS_LABELS: Record<ClassroomStatus, string> = {
  ACTIVE: "Đang hoạt động",
  ARCHIVED: "Lưu trữ",
  CLOSED: "Đã đóng",
};

export function StudentClassPostListPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassroomStatus | "">("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getEnrolledClasses()
      .then(items => { if (active) setClasses(items); })
      .catch(cause => {
        if (!active) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setCanRetry(status !== 401 && status !== 403);
        setError(status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : status === 403 ? "Bạn không có quyền xem danh sách lớp học."
            : "Không thể tải danh sách lớp. Vui lòng thử lại!");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestVersion]);

  const query = searchQuery.trim().toLocaleLowerCase();
  const filteredClasses = classes.filter(classroom =>
    classroom.code.toLocaleLowerCase().includes(query)
    && (!statusFilter || classroom.status === statusFilter));
  const pageCount = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visibleClasses = filteredClasses.slice(start, start + PAGE_SIZE);

  function resetFilters() {
    setSearchQuery("");
    setStatusFilter("");
    setCurrentPage(1);
  }

  return <section className="class-list-page student-class-page" aria-label="Danh sách lớp học của tôi">
    <div className="class-list-heading">
      <div><h2>Lớp học của tôi</h2><p>Theo dõi các lớp học bạn đã tham gia.</p></div>
    </div>
    <div className="class-list-filters">
      <input type="search" aria-label="Tìm theo mã lớp" placeholder="Tìm theo mã lớp…" value={searchQuery}
        onChange={event => { setSearchQuery(event.target.value); setCurrentPage(1); }} />
      <select aria-label="Trạng thái lớp học" value={statusFilter}
        onChange={event => { setStatusFilter(event.target.value as ClassroomStatus | ""); setCurrentPage(1); }}>
        <option value="">Tất cả trạng thái</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) =>
          <option key={value} value={value}>{label}</option>)}
      </select>
      <button type="button" onClick={resetFilters}>Đặt lại</button>
    </div>
    {loading ? <div className="class-list-state" role="status">Đang tải danh sách lớp…</div>
      : error ? <div className="class-list-state class-list-error" role="alert"><p>{error}</p>
        {canRetry && <button type="button" onClick={() => setRequestVersion(value => value + 1)}>Thử lại</button>}
      </div> : <>
        {filteredClasses.length === 0 ? <div className="class-list-state" role="status">
          <p>{classes.length === 0 ? "Bạn chưa tham gia lớp học nào" : "Không tìm thấy lớp học phù hợp"}</p>
          {classes.length > 0 && <button type="button" onClick={resetFilters}>Đặt lại bộ lọc</button>}
        </div> : <div className="class-list-grid">
          {visibleClasses.map(classroom => <article className="class-list-card" key={classroom.id}>
            <div className="class-list-card-header"><h3>{classroom.code}</h3></div>
            <div className="class-list-card-body">
              <span className={`class-list-badge class-list-badge-${classroom.status.toLowerCase()}`}>
                {STATUS_LABELS[classroom.status]}</span>
              <p className="class-list-count">Học sinh: <strong>{classroom.studentCount}</strong> học viên</p>
              <div className="class-list-actions">
                <button type="button" onClick={() => navigate(`/classes/${classroom.id}/posts`)}>Xem chi tiết</button>
              </div>
            </div>
          </article>)}
        </div>}
        <footer className="class-list-footer">
          <span role="status">Hiển thị {filteredClasses.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filteredClasses.length)} trên tổng số {filteredClasses.length} lớp học</span>
          <nav className="class-list-pagination" aria-label="Phân trang lớp học">
            <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>‹</button>
            <span>Trang {page} / {pageCount}</span>
            <button type="button" aria-label="Trang sau" disabled={page >= pageCount} onClick={() => setCurrentPage(page + 1)}>›</button>
          </nav>
        </footer>
      </>}
  </section>;
}
