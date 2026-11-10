import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { ConjugationFormModal } from "./ConjugationFormModal";
import {
  deleteConjugationForm,
  getConjugationForms,
  type ConjugationFormSummary,
  type ContentStatus,
} from "../../api/conjugationFormApi";

// Màn "Quản lý thể chia" (UC-47).
// sd View Conjugation Forms: 1 openConjugationList → 1.1 getAll → 1.2 showEmptyState / 1.3 displayList / 1.4 showError(MSG20).
// sd Delete / Archive Conjugation Form: 1 clickDelete → 1.1 showConfirmDialog → 2 clickCancel / 3 clickConfirm
//   → 3.1 delete(id) → 3.2 showError(message) / 3.3 showMessage(archived ? MSG33 : MSG34) → ref SD View (làm mới danh sách).

const MOD_COLOR = "#0d9488";

// Nội dung thông báo theo mục 5.3 (Application Messages List) của SRS.
// TODO: đổi số MSG33 / MSG34 cho khớp mục 5.3 của SRS nếu nhóm đã đánh số khác.
const MESSAGES = {
  MSG20: "Lỗi truy vấn cơ sở dữ liệu, vui lòng thử lại.",
  MSG31: "Cập nhật thành công!",
  MSG33: "Thể chia đã có dữ liệu học tập nên không thể xóa, hệ thống đã chuyển sang trạng thái Lưu trữ.",
  MSG34: "Xóa thể chia thành công!",
} as const;
const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;
const DESCRIPTION_PREVIEW_LENGTH = 80;

const STATUS_OPTIONS: ContentStatus[] = ["DRAFT", "PUBLISHED", "HIDDEN", "ARCHIVED"];

const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã xuất bản",
  HIDDEN: "Ẩn",
  ARCHIVED: "Lưu trữ",
};

const STATUS_PILL_CLASS: Record<ContentStatus, string> = {
  DRAFT: "pill-pending",
  PUBLISHED: "pill-active",
  HIDDEN: "pill-total",
  ARCHIVED: "pill-locked",
};

function summarize(text?: string | null) {
  if (!text) return "—";
  return text.length > DESCRIPTION_PREVIEW_LENGTH ? `${text.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…` : text;
}

export function ModeratorConjugationTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<ConjugationFormSummary | null>(null);
  const [lastSaved, setLastSaved] = useState<{ form: ConjugationFormSummary; isEdit: boolean } | null>(null);

  // sd Delete / Archive Conjugation Form
  const [deletingForm, setDeletingForm] = useState<ConjugationFormSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // keyword đang gõ (searchInput) tách với keyword đã áp dụng (sau debounce hoặc Enter) để không gọi API ở mỗi phím
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);

  const [forms, setForms] = useState<ConjugationFormSummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Bỏ qua response của request cũ khi người dùng đổi bộ lọc liên tục
  const requestIdRef = useRef(0);

  // 1.1: getAll(keyword, status, page, size)
  const fetchForms = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setHasError(false);
    try {
      const data = await getConjugationForms({
        keyword: keyword.trim() || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        size: PAGE_SIZE,
      });
      if (requestId !== requestIdRef.current) return;
      setForms(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setHasError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [keyword, statusFilter, page]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Tự áp dụng từ khóa sau khi ngừng gõ (debounce) để không gọi API ở mỗi phím bấm
  useEffect(() => {
    if (searchInput === keyword) return;
    const timer = setTimeout(() => {
      setPage(0);
      setKeyword(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, keyword]);

  // Nhấn Enter trong ô tìm kiếm: áp dụng từ khóa ngay, không chờ debounce
  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    // Từ khóa và trang không đổi → setState không kích hoạt render lại, nên gọi API trực tiếp để làm mới danh sách
    if (searchInput === keyword && page === 0) {
      fetchForms();
      return;
    }
    setPage(0);
    setKeyword(searchInput);
  }

  function openCreateForm() {
    setLastSaved(null);
    setDeleteNotice(null);
    setEditingForm(null);
    setIsModalOpen(true);
  }

  // sd Update Conjugation Form, 1: openEditForm(form) — nhấn "Sửa" trên dòng thể chia
  function openEditForm(form: ConjugationFormSummary) {
    setLastSaved(null);
    setDeleteNotice(null);
    setEditingForm(form);
    setIsModalOpen(true);
  }

  // Create 3.5 / Update 3.7: showMessage(MSG31), sau đó làm mới danh sách (SD View Conjugation Forms)
  function handleSaved(saved: ConjugationFormSummary, isEdit: boolean) {
    setLastSaved({ form: saved, isEdit });
    fetchForms();
  }

  // 1: clickDelete(id) → 1.1: showConfirmDialog()
  function openDeleteDialog(form: ConjugationFormSummary) {
    setLastSaved(null);
    setDeleteNotice(null);
    setDeletingForm(form);
  }

  // 2: clickCancel() → 2.1: closeDialog()
  function closeDeleteDialog() {
    if (!deleting) setDeletingForm(null);
  }

  // 3: clickConfirm()
  async function handleConfirmDelete() {
    if (!deletingForm) return;
    const target = deletingForm;
    setDeleting(true);
    try {
      // 3.1: delete(id) — DELETE /api/moderator/conjugation-forms/{id}
      const result = await deleteConjugationForm(target.id);

      // 3.3: showMessage(result.archived ? MSG lưu trữ : MSG xóa)
      setDeleteNotice({
        type: "success",
        text: result.archived
          ? `${MESSAGES.MSG33} (${target.nameJp} - ${target.code})`
          : `${MESSAGES.MSG34} Đã xóa ${target.nameJp} (${target.code}).`,
      });
      setDeletingForm(null);

      // Xóa dòng cuối cùng của trang cuối thì lùi về trang trước; đổi page sẽ tự gọi lại fetchForms.
      if (!result.archived && forms.length === 1 && page > 0) {
        setPage((p) => p - 1);
      } else {
        // ref: SD-29.2 View Conjugation Forms — làm mới danh sách
        fetchForms();
      }
    } catch (error) {
      // 3.2: showError(message) — 404 khi thể chia không còn tồn tại, hoặc lỗi khác từ server
      const serverMessage = isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message : undefined;
      setDeleteNotice({ type: "error", text: serverMessage || MESSAGES.MSG20 });
      setDeletingForm(null);
      if (isAxiosError(error) && error.response?.status === 404) fetchForms();
    } finally {
      setDeleting(false);
    }
  }

  const isFiltering = keyword.trim() !== "" || statusFilter !== "ALL";

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Quản lý thể chia</h2>
          <p className="admin-main-subtitle">Các thể chia động từ dùng cho phần luyện chia động từ của học viên.</p>
        </div>
        <button
          type="button"
          className="mod-btn-add"
          style={{ backgroundColor: MOD_COLOR }}
          onClick={openCreateForm}
        >
          + Thêm thể chia
        </button>
      </div>

      {lastSaved && (
        <div className="admin-alert-banner success" role="status">
          ✅ {MESSAGES.MSG31}{" "}
          {lastSaved.isEdit
            ? `Đã cập nhật thể chia ${lastSaved.form.nameJp} (${lastSaved.form.code}).`
            : `Đã tạo thể chia ${lastSaved.form.nameJp} (${lastSaved.form.code}) ở trạng thái Nháp.`}
        </div>
      )}

      {deleteNotice && (
        <div className={`admin-alert-banner ${deleteNotice.type}`} role={deleteNotice.type === "error" ? "alert" : "status"}>
          {deleteNotice.type === "success" ? "✅" : "⚠️"} {deleteNotice.text}
        </div>
      )}

      <div className="admin-filter-card">
        <form className="admin-filter-form" onSubmit={handleSearchSubmit}>
          <div className="admin-search-wrapper">
            <span className="search-mag-icon">🔍</span>
            <input
              type="text"
              className="admin-filter-input"
              placeholder="Tìm theo mã, tên tiếng Việt hoặc tên tiếng Nhật..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ContentStatus | "ALL");
              setPage(0);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]} ({status})
              </option>
            ))}
          </select>

        </form>

        {!hasError && (
          <div className="admin-quick-stats-row">
            <span className="quick-stats-label">Tổng quan:</span>
            <span className="stat-pill pill-total">{totalElements} Thể chia</span>
          </div>
        )}
      </div>

      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <div className="admin-spinner mod-spinner" />
            <span>Đang tải danh sách thể chia...</span>
          </div>
        ) : hasError ? (
          // 1.4: showError("MSG20") kèm nút "Thử lại"
          <div className="admin-table-empty">
            <div className="admin-alert-banner error mod-error-banner" role="alert">
              <span>⚠️ {MESSAGES.MSG20}</span>
              <button type="button" className="mod-btn-retry" onClick={fetchForms}>
                Thử lại
              </button>
            </div>
          </div>
        ) : totalElements === 0 ? (
          // 1.2: showEmptyState()
          <div className="admin-table-empty">
            <span style={{ fontSize: "2rem" }}>📭</span>
            <p style={{ marginTop: "8px", fontWeight: 700, color: "#0f172a" }}>
              {isFiltering ? "Không tìm thấy thể chia phù hợp" : "Chưa có thể chia nào"}
            </p>
            {!isFiltering && <p>Bấm "+ Thêm thể chia" để tạo thể chia đầu tiên.</p>}
          </div>
        ) : (
          // 1.3: displayList(forms)
          <div className="admin-table-responsive">
            <table className="admin-dekiru-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>STT</th>
                  <th>TÊN THỂ CHIA</th>
                  <th>MÔ TẢ</th>
                  <th style={{ textAlign: "center", width: "110px" }}>SỐ CÂU/LƯỢT</th>
                  <th style={{ textAlign: "center", width: "120px" }}>SỐ CÂU ĐÃ GẮN</th>
                  <th style={{ width: "140px" }}>TRẠNG THÁI</th>
                  <th style={{ textAlign: "center", width: "150px" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((form, index) => (
                  <tr key={form.id}>
                    <td>
                      <span className="mod-lesson-row-index">
                        {String(page * PAGE_SIZE + index + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{form.nameJp}</div>
                      <div className="cell-email">{form.nameVi}</div>
                    </td>
                    <td className="cell-email" title={form.description ?? undefined}>
                      {summarize(form.description)}
                    </td>
                    <td style={{ textAlign: "center" }}>{form.questionsPerPractice}</td>
                    <td style={{ textAlign: "center" }}>{form.linkedQuestionCount}</td>
                    <td>
                      <span className={`status-badge-pill ${STATUS_PILL_CLASS[form.status]}`}>
                        <span className="pill-dot" />
                        {STATUS_LABEL[form.status]}
                      </span>
                    </td>
                    <td>
                      <div className="mod-text-actions">
                        <button
                          type="button"
                          className="mod-btn-text-action edit"
                          title="Sửa thể chia"
                          aria-label={`Sửa thể chia ${form.code}`}
                          onClick={() => openEditForm(form)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="mod-btn-text-action delete"
                          title="Xóa thể chia"
                          aria-label={`Xóa thể chia ${form.code}`}
                          onClick={() => openDeleteDialog(form)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !hasError && totalPages > 1 && (
          <div className="admin-pagination-footer">
            <span className="pagination-info">
              Hiển thị trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({totalElements} thể chia)
            </span>
            <div className="pagination-buttons">
              <button type="button" className="btn-page" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                ← Trang trước
              </button>
              <button
                type="button"
                className="btn-page"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau →
              </button>
            </div>
          </div>
        )}
      </div>

      <ConjugationFormModal
        isOpen={isModalOpen}
        editingForm={editingForm}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />

      {/* 1.1: showConfirmDialog() */}
      {deletingForm && (
        <div className="modal-overlay" onClick={closeDeleteDialog}>
          <div className="modal-card" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa thể chia</h3>
              <button type="button" className="modal-btn-close" disabled={deleting} onClick={closeDeleteDialog}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">
                Bạn có chắc chắn muốn xóa thể chia{" "}
                <strong>
                  {deletingForm.nameJp} ({deletingForm.code})
                </strong>{" "}
                không?
              </p>
              <p className="modal-description">
                Nếu học viên đã luyện tập thể chia này, hệ thống sẽ không xóa mà chuyển sang trạng thái{" "}
                <strong>Lưu trữ</strong>. Nếu chưa, thể chia cùng các câu hỏi đã gắn sẽ bị xóa vĩnh viễn.
              </p>
              <div className="modal-actions-row">
                {/* 2: clickCancel() */}
                <button type="button" className="btn-modal-cancel" disabled={deleting} onClick={closeDeleteDialog}>
                  Hủy bỏ
                </button>
                {/* 3: clickConfirm() */}
                <button type="button" className="btn-modal-delete" disabled={deleting} onClick={handleConfirmDelete}>
                  {deleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
