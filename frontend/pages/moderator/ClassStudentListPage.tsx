import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getClassStudents, getMyClasses, removeStudent, type ClassResponse, type ClassStudentPage,
  type ClassStudentResponse, type StudentStatus, type AddStudentsResponse } from "../../api/classApi";
import { AddStudentModal, SKIP_LABELS } from "./AddStudentModal";
import "./ClassStudentListPage.css";

const PAGE_SIZE = 10;
const STATUS_LABELS: Record<StudentStatus, string> = {
  PENDING: "Chờ duyệt", ACTIVE: "Đang hoạt động", REJECTED: "Bị từ chối", LOCKED: "Bị khóa",
};
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export function ClassStudentListPage({ classId }: { classId: number }) {
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<ClassResponse | null>(null);
  const [students, setStudents] = useState<ClassStudentPage | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addResult, setAddResult] = useState<AddStudentsResponse | null>(null);
  const [studentToRemove, setStudentToRemove] = useState<ClassStudentResponse | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [removeSuccess, setRemoveSuccess] = useState("");
  const [removeBusy, setRemoveBusy] = useState(false);
  const removing = useRef(false);
  const removeDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (studentToRemove) removeDialog.current?.showModal();
  }, [studentToRemove]);

  function openRemoveConfirmation(student: ClassStudentResponse) {
    setRemoveSuccess("");
    setRemoveError("");
    setStudentToRemove(student);
  }

  function closeRemoveConfirmation() {
    if (!removing.current) setStudentToRemove(null);
  }

  async function confirmRemove() {
    if (!studentToRemove || removing.current) return;
    removing.current = true;
    setRemoveBusy(true);
    setRemoveError("");
    try {
      await removeStudent(classId, studentToRemove.id);
      setRemoveSuccess("Gỡ học viên khỏi lớp thành công.");
      setStudentToRemove(null);
      if (students?.content.length === 1 && page > 0) {
        setPage((value) => value - 1);
      } else {
        setRequestVersion((value) => value + 1);
      }
    } catch (cause) {
      const httpStatus = axios.isAxiosError(cause) ? cause.response?.status : undefined;
      setRemoveError(httpStatus === 403 ? "Bạn không có quyền gỡ học viên khỏi lớp này."
        : httpStatus === 404 ? "Học viên không tồn tại trong lớp hoặc lớp đã bị xóa."
          : "Không thể gỡ học viên. Vui lòng thử lại.");
    } finally {
      removing.current = false;
      setRemoveBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!Number.isSafeInteger(classId) || classId <= 0) {
      setError("Mã lớp không hợp lệ.");
      setCanRetry(false);
      setLoading(false);
      return;
    }
    Promise.all([getMyClasses(), getClassStudents(classId, search, status, page, PAGE_SIZE)])
      .then(([classes, studentPage]) => {
        if (!active) return;
        setClassroom(classes.find((item) => item.id === classId) ?? null);
        setStudents(studentPage);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const httpStatus = axios.isAxiosError(cause) ? cause.response?.status : undefined;
        setCanRetry(httpStatus !== 401 && httpStatus !== 403 && httpStatus !== 404);
        setError(httpStatus === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : httpStatus === 403 ? "Bạn không có quyền xem danh sách học viên của lớp này."
            : httpStatus === 404 ? "Lớp học không tồn tại."
              : "Không thể tải danh sách học viên. Vui lòng thử lại.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classId, search, status, page, requestVersion]);

  const totalPages = students?.totalPages ?? 0;
  const hasFilters = !!search || !!status;
  const firstStudent = students?.totalElements ? page * PAGE_SIZE + 1 : 0;
  const lastStudent = students ? Math.min((page + 1) * PAGE_SIZE, students.totalElements) : 0;

  return (
    <section className="class-student-page" aria-label="Danh sách học viên trong lớp">
      <button type="button" className="class-student-back"
        onClick={() => navigate(`/moderator/classes/${classId}/posts`)}>← Trở lại lớp</button>
      <header className="class-student-heading">
        <div className="class-student-heading-top">
          <h2>Danh sách học viên trong lớp</h2>
          <button type="button" disabled={!classroom || loading || !!error}
            onClick={() => { setAddResult(null); setShowAddModal(true); }}>+ Thêm sinh viên</button>
        </div>
        <p className="class-student-breadcrumb">Trang chủ / Quản lý lớp học
          {classroom ? ` / Lớp ${classroom.code}` : ""} / Danh sách học viên</p>
        <p>Moderator quản lý danh sách học viên tham gia lớp học.</p>
      </header>

      {showAddModal && <AddStudentModal classId={classId} onClose={() => setShowAddModal(false)}
        onAdded={(result) => {
          setShowAddModal(false);
          setAddResult(result);
          setSearchInput("");
          setSearch("");
          setStatus("");
          setPage(0);
          setRequestVersion((value) => value + 1);
        }} />}
      {addResult && <div className="class-student-add-result" role="status">
        <p>Đã thêm {addResult.addedCount} học viên; bỏ qua {addResult.skippedCount} email.</p>
        {addResult.skippedEmails.length > 0 && <ul>{addResult.skippedEmails.map((item, index) =>
          <li key={`${item.email}-${index}`}>{item.email || "(trống)"}: {SKIP_LABELS[item.reason]}</li>)}</ul>}
      </div>}
      {removeSuccess && <p className="class-student-remove-success" role="status">{removeSuccess}</p>}
      {studentToRemove && <dialog ref={removeDialog} className="class-student-remove-dialog"
        aria-labelledby="class-student-remove-title"
        onCancel={(event) => { event.preventDefault(); closeRemoveConfirmation(); }}>
        <h2 id="class-student-remove-title">Gỡ học viên khỏi lớp</h2>
        <p>Bạn có chắc muốn gỡ <strong>{studentToRemove.fullName || studentToRemove.email}</strong> khỏi lớp
          {classroom ? ` ${classroom.code}` : ""}?</p>
        {removeError && <p className="class-student-remove-error" role="alert">{removeError}</p>}
        <div className="class-student-remove-actions">
          <button type="button" disabled={removeBusy} onClick={closeRemoveConfirmation}>Hủy</button>
          <button type="button" disabled={removeBusy} onClick={confirmRemove}>
            {removeBusy ? "Đang gỡ…" : "Xác nhận xóa"}</button>
        </div>
      </dialog>}

      <div className="class-student-panel">
        <form className="class-student-filters" onSubmit={(event) => {
          event.preventDefault(); setPage(0); setSearch(searchInput.trim());
        }}>
          <input type="search" aria-label="Tìm học viên" placeholder="Tìm theo email, tên…"
            value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
          <select aria-label="Trạng thái học viên" value={status} onChange={(event) => {
            setStatus(event.target.value as StudentStatus | ""); setPage(0);
          }}>
            <option value="">Trạng thái (Tất cả)</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) =>
              <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit">Tìm kiếm</button>
          <button type="button" onClick={() => {
            setSearchInput(""); setSearch(""); setStatus(""); setPage(0);
          }}>↶ Đặt lại</button>
        </form>

        {loading ? <div className="class-student-state" role="status">Đang tải danh sách học viên…</div>
          : error ? <div className="class-student-state class-student-error" role="alert">
            <p>{error}</p>
            {canRetry && <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>Thử lại</button>}
          </div>
            : students && <>
              <div className="class-student-table-wrap">
                <table>
                  <thead><tr><th>STT</th><th>Họ và tên</th><th>Email</th><th>Ngày tham gia</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>{students.content.map((student, index) => <tr key={student.id}>
                    <td>{page * PAGE_SIZE + index + 1}</td>
                    <td><span className="class-student-person">
                      {student.avatarUrl ? <img src={student.avatarUrl} alt="" />
                        : <span className="class-student-avatar" aria-hidden="true">
                          {student.fullName?.trim().charAt(0).toUpperCase() || "?"}</span>}
                      <span>{student.fullName || "Chưa cập nhật tên"}</span>
                    </span></td>
                    <td>{student.email}</td>
                    <td>{dateFormatter.format(new Date(student.joinedAt))}</td>
                    <td><span className={`class-student-status class-student-status-${student.status.toLowerCase()}`}>
                      {STATUS_LABELS[student.status]}</span></td>
                    <td><button type="button" className="class-student-remove-trigger"
                      onClick={() => openRemoveConfirmation(student)}>Gỡ khỏi lớp</button></td>
                  </tr>)}</tbody>
                </table>
                {students.content.length === 0 && <div className="class-student-state" role="status">
                  {hasFilters ? "Không tìm thấy học viên phù hợp." : "Chưa có học viên nào."}
                </div>}
              </div>
              <footer className="class-student-footer">
                <span role="status">Hiển thị {firstStudent} - {lastStudent} trên tổng số {students.totalElements} học viên</span>
                <nav aria-label="Phân trang học viên">
                  <button type="button" aria-label="Trang trước" disabled={page === 0}
                    onClick={() => setPage(page - 1)}>‹</button>
                  <span>{page + 1}</span>
                  <button type="button" aria-label="Trang sau" disabled={page + 1 >= totalPages}
                    onClick={() => setPage(page + 1)}>›</button>
                </nav>
              </footer>
            </>}
      </div>
    </section>
  );
}
