import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { deleteClass, getMyClasses, type ClassResponse, type ClassroomStatus } from "../../api/classApi";
import "./ClassListPage.css";
import { ClassCreateModal } from "./ClassCreateModal";
import { ClassEditModal } from "./ClassEditModal";

const PAGE_SIZE = 4;
const STATUS_LABELS: Record<ClassroomStatus, string> = {
  ACTIVE: "Đang hoạt động",
  ARCHIVED: "Lưu trữ",
  CLOSED: "Đã đóng",
};

export function ClassListPage() {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<ClassResponse | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassResponse | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleting = useRef(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [success, setSuccess] = useState("");
  const [classes, setClasses] = useState<ClassResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClassroomStatus | "">("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (classToDelete) deleteDialog.current?.showModal();
  }, [classToDelete]);

  function openDeleteConfirmation(classroom: ClassResponse) {
    setSuccess("");
    setDeleteError("");
    setClassToDelete(classroom);
  }

  function handleCancelDelete() {
    if (!deleting.current) setClassToDelete(null);
  }

  async function handleConfirmDelete() {
    if (!classToDelete || deleting.current) return;
    deleting.current = true;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await deleteClass(classToDelete.id);
      setClassToDelete(null);
      setSuccess("Xóa lớp học thành công.");
      setRequestVersion((value) => value + 1);
    } catch (cause) {
      const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      const message = axios.isAxiosError(cause) ? cause.response?.data?.message : undefined;
      setDeleteError((status === 403 || status === 404 || status === 409) && typeof message === "string"
        ? message : "Không thể xóa lớp học. Vui lòng thử lại.");
    } finally {
      deleting.current = false;
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setCanRetry(true);
    getMyClasses()
      .then((data) => {
        if (active) setClasses(data);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const status = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setCanRetry(status !== 401 && status !== 403);
        setError(status === 403
          ? "Bạn không có quyền truy cập danh sách lớp học."
          : status === 401
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            : "Không thể tải danh sách lớp. Vui lòng thử lại!");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [requestVersion]);

  const query = searchQuery.trim().toLocaleLowerCase();
  const filteredClasses = classes.filter((classroom) =>
    classroom.code.toLocaleLowerCase().includes(query)
    && (!statusFilter || classroom.status === statusFilter));
  const pageCount = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const start = (page - 1) * PAGE_SIZE;
  const visibleClasses = filteredClasses.slice(start, start + PAGE_SIZE);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  return (
    <section className="class-list-page" aria-label="Danh sách lớp học">
      <div className="class-list-heading">
        <div>
          <h2>Quản lý lớp học</h2>
          <p>Theo dõi danh sách lớp học và số học sinh trong các lớp bạn quản lý.</p>
        </div>
        <button type="button" className="class-create-trigger" onClick={() => { setSuccess(""); setShowCreate(true); }}>+ Tạo lớp mới</button>
      </div>

      {success && <p role="status">{success}</p>}
      {selectedClass && <ClassEditModal key={selectedClass.id} classroom={selectedClass}
        onClose={() => setSelectedClass(null)} onUpdated={() => {
          setSelectedClass(null);
          setSuccess("Cập nhật lớp học thành công.");
          setRequestVersion((value) => value + 1);
        }} />}
      {classToDelete && (
        <dialog ref={deleteDialog} className="class-delete-modal" aria-labelledby="class-delete-title"
          onCancel={(event) => { event.preventDefault(); handleCancelDelete(); }}>
          <div className="class-create-header">
            <h2 id="class-delete-title">Xóa lớp học</h2>
            <button type="button" className="class-create-close" aria-label="Đóng xác nhận xóa"
              disabled={deleteBusy} onClick={handleCancelDelete}>×</button>
          </div>
          <p>Bạn có chắc chắn muốn xóa lớp <strong>{classToDelete.code}</strong>?</p>
          <p className="class-delete-note">Lớp đã có học sinh hoặc bài đăng sẽ không thể xóa.</p>
          {deleteError && <p className="class-list-error" role="alert">{deleteError}</p>}
          <div className="class-create-buttons">
            <button type="button" disabled={deleteBusy} onClick={handleCancelDelete}>Hủy</button>
            <button type="button" className="class-delete-submit" disabled={deleteBusy} onClick={handleConfirmDelete}>
              {deleteBusy ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
          </div>
        </dialog>
      )}
      {showCreate && <ClassCreateModal onClose={() => setShowCreate(false)} onCreated={() => {
        setShowCreate(false);
        setSuccess("Tạo lớp học thành công.");
        resetFilters();
        setRequestVersion((value) => value + 1);
      }} />}
      <div className="class-list-filters">
        <input
          type="search" aria-label="Tìm theo mã lớp" placeholder="Tìm theo mã lớp…"
          value={searchQuery}
          onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }}
        />
        <select aria-label="Trạng thái lớp học" value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as ClassroomStatus | "");
            setCurrentPage(1);
          }}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="button" onClick={resetFilters}>Đặt lại</button>
      </div>

      {loading ? (
        <div className="class-list-state" role="status">Đang tải danh sách lớp…</div>
      ) : error ? (
        <div className="class-list-state class-list-error" role="alert">
          <p>{error}</p>
          {canRetry && <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>Thử lại</button>}
        </div>
      ) : (
        <>
          {filteredClasses.length === 0 ? (
            <div className="class-list-state" role="status">
              <p>{classes.length === 0 ? "Chưa có lớp học nào" : "Không tìm thấy lớp học phù hợp"}</p>
              {classes.length > 0 && <button type="button" onClick={resetFilters}>Đặt lại bộ lọc</button>}
            </div>
          ) : (
            <div className="class-list-grid">
              {visibleClasses.map((classroom) => (
                <article className="class-list-card" key={classroom.id}>
                  <div className="class-list-card-header"><h3>{classroom.code}</h3></div>
                  <div className="class-list-card-body">
                    <span className={`class-list-badge class-list-badge-${classroom.status.toLowerCase()}`}>
                      {STATUS_LABELS[classroom.status]}
                    </span>
                    <p className="class-list-count">Học sinh: <strong>{classroom.studentCount}</strong> học viên</p>
                    <div className="class-list-actions">
                      <button type="button" onClick={() => navigate(`/moderator/classes/${classroom.id}/posts`)}>Xem chi tiết</button>
                      <button type="button" onClick={() => { setSuccess(""); setSelectedClass(classroom); }}>Chỉnh sửa</button>
                      <button type="button" onClick={() => openDeleteConfirmation(classroom)}>Xóa</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <footer className="class-list-footer">
            <span role="status">
              Hiển thị {filteredClasses.length === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, filteredClasses.length)} trên tổng số {filteredClasses.length} lớp học
            </span>
            <nav className="class-list-pagination" aria-label="Phân trang lớp học">
              <button type="button" aria-label="Trang trước" disabled={page <= 1}
                onClick={() => setCurrentPage(page - 1)}>‹</button>
              <span>Trang {page} / {pageCount}</span>
              <button type="button" aria-label="Trang sau" disabled={page >= pageCount}
                onClick={() => setCurrentPage(page + 1)}>›</button>
            </nav>
          </footer>
        </>
      )}
    </section>
  );
}
