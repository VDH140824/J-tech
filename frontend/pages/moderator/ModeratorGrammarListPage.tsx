import { useEffect, useState } from "react";
import {
  getGrammarsByLesson,
  createGrammar,
  updateGrammar,
  deleteGrammar,
  type GrammarItem,
  type GrammarFormInput,
} from "../../api/grammarApi";
import type { LessonSummary } from "../../api/lessonApi";

interface ModeratorGrammarListPageProps {
  courseName: string;
  chapterNo: number;
  chapterTitle: string;
  lesson: LessonSummary;
  onBack: () => void;
  readOnly?: boolean;
}

export function ModeratorGrammarListPage({
  courseName,
  chapterNo,
  chapterTitle,
  lesson,
  onBack,
  readOnly = false,
}: ModeratorGrammarListPageProps) {
  const [grammars, setGrammars] = useState<GrammarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GrammarItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<GrammarItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form input state
  const [formData, setFormData] = useState<GrammarFormInput>({
    structureName: "",
    meaningVi: "",
    usageExplanation: "",
    exampleJp: "",
    exampleVi: "",
    videoUrl: "",
    displayOrder: 1,
    status: "PUBLISHED",
  });

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const fetchGrammars = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGrammarsByLesson(lesson.id, readOnly ? "PUBLISHED" : statusFilter);
      setGrammars(data);
    } catch (err: unknown) {
      console.error("Lỗi khi tải danh sách ngữ pháp:", err);
      setError("Không thể tải danh sách ngữ pháp từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrammars();
  }, [lesson.id, statusFilter, readOnly]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (readOnly) return;
    setEditingItem(null);
    const nextOrder = grammars.length > 0 ? Math.max(...grammars.map((g) => g.displayOrder || 0)) + 1 : 1;
    setFormData({
      structureName: "",
      meaningVi: "",
      usageExplanation: "",
      exampleJp: "",
      exampleVi: "",
      videoUrl: "",
      displayOrder: nextOrder,
      status: "PUBLISHED",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: GrammarItem) => {
    if (readOnly) return;
    setEditingItem(item);
    setFormData({
      structureName: item.structureName,
      meaningVi: item.meaningVi,
      usageExplanation: item.usageExplanation,
      exampleJp: item.exampleJp,
      exampleVi: item.exampleVi,
      videoUrl: item.videoUrl || "",
      displayOrder: item.displayOrder,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    if (readOnly) return;
    e.preventDefault();
    if (!formData.structureName.trim() || !formData.meaningVi.trim()) {
      alert("Vui lòng điền cấu trúc và ý nghĩa ngữ pháp!");
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await updateGrammar(editingItem.id, formData);
        showNotification(`Đã cập nhật mẫu ngữ pháp "${formData.structureName}" thành công!`);
      } else {
        await createGrammar(lesson.id, formData);
        showNotification(`Đã thêm mẫu ngữ pháp "${formData.structureName}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      await fetchGrammars();
    } catch (err: unknown) {
      console.error("Lỗi khi lưu mẫu ngữ pháp:", err);
      alert("Đã xảy ra lỗi khi lưu ngữ pháp. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (readOnly || !deletingItem) return;
    try {
      setSubmitting(true);
      await deleteGrammar(deletingItem.id);
      showNotification(`Đã xóa mẫu ngữ pháp "${deletingItem.structureName}" thành công!`);
      setDeletingItem(null);
      await fetchGrammars();
    } catch (err: unknown) {
      console.error("Lỗi khi xóa ngữ pháp:", err);
      alert("Không thể xóa ngữ pháp. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  // Search Filter
  const filteredGrammars = grammars.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      g.structureName.toLowerCase().includes(q) ||
      g.meaningVi.toLowerCase().includes(q) ||
      g.usageExplanation.toLowerCase().includes(q) ||
      g.exampleJp.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {actionSuccess && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            backgroundColor: "#2563eb",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 9999,
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Breadcrumb Row */}
      <div className="mod-chapter-back-row">
        <button type="button" className="mod-btn-back" onClick={onBack}>
          <span>←</span> Quay lại danh sách bài học
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo} / Ngữ pháp / Bài {lesson.lessonNo}: {lesson.title}
        </span>
      </div>

      {/* Page Header */}
      <div className="admin-page-header">
        <div className="mod-header-action-row" style={{ width: "100%" }}>
          <div className="admin-header-titles">
            <h2 className="admin-main-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>📄</span>
              <span>Danh sách ngữ pháp (list_grammar)</span>
            </h2>
            <p className="admin-main-subtitle">
              Quản lý các mẫu ngữ pháp thuộc <strong>Bài {lesson.lessonNo}: {lesson.title}</strong> (Dữ liệu từ bảng <code>grammar</code>).
            </p>
          </div>
          {!readOnly && <button
            type="button"
            className="mod-btn-add"
            style={{ backgroundColor: "#2563eb", padding: "11px 22px" }}
            onClick={handleOpenCreateModal}
          >
            <span>➕</span> Thêm ngữ pháp mới
          </button>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="mod-section-toolbar">
        <div className="mod-toolbar-left">
          <div className="mod-toolbar-search">
            <span className="search-mag-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm mẫu ngữ pháp, ý nghĩa, ví dụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!readOnly && <select
            className="mod-toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
            <option value="DRAFT">Bản nháp (DRAFT)</option>
            <option value="HIDDEN">Ẩn (HIDDEN)</option>
          </select>}
        </div>
        <div style={{ fontSize: "0.86rem", color: "#64748b", fontWeight: 600 }}>
          Hiển thị <strong>{filteredGrammars.length}</strong> mẫu ngữ pháp
        </div>
      </div>

      {/* Table Content */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">
            <div className="admin-loading-spinner" style={{ borderTopColor: "#2563eb" }} />
            <p className="admin-loading-text">Đang tải danh sách ngữ pháp...</p>
          </div>
        ) : error ? (
          <div className="admin-empty-state">
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <h3 className="admin-empty-title">Không thể tải ngữ pháp</h3>
            <p className="admin-empty-desc">{error}</p>
            <button
              type="button"
              className="mod-btn-add"
              style={{ backgroundColor: "#2563eb", margin: "14px auto 0" }}
              onClick={fetchGrammars}
            >
              Thử lại
            </button>
          </div>
        ) : filteredGrammars.length === 0 ? (
          <div className="admin-empty-state">
            <span style={{ fontSize: "2.4rem" }}>📭</span>
            <h3 className="admin-empty-title">Chưa có mẫu ngữ pháp nào</h3>
            <p className="admin-empty-desc">
              {readOnly ? "Chưa có mẫu ngữ pháp được xuất bản phù hợp với lựa chọn này." : searchQuery || statusFilter !== "ALL"
                ? "Không tìm thấy mẫu ngữ pháp nào phù hợp với bộ lọc."
                : `Bài ${lesson.lessonNo} chưa có mẫu ngữ pháp nào. Nhấn nút "Thêm ngữ pháp mới" để bắt đầu.`}
            </p>
            {!readOnly && <button
              type="button"
              className="mod-btn-add"
              style={{ backgroundColor: "#2563eb", margin: "16px auto 0" }}
              onClick={handleOpenCreateModal}
            >
              <span>➕</span> Thêm ngữ pháp mới
            </button>}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>TT</th>
                  <th style={{ width: "180px" }}>Cấu trúc ngữ pháp</th>
                  <th style={{ width: "200px" }}>Ý nghĩa tiếng Việt</th>
                  <th>Giải thích &amp; Ví dụ</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Thứ tự</th>
                  <th style={{ width: "140px" }}>Trạng thái</th>
                  {!readOnly && <th style={{ width: "120px", textAlign: "right" }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredGrammars.map((item, idx) => (
                  <tr key={item.id}>
                    <td>
                      <span className="row-index">#{idx + 1}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: "1rem",
                          color: "#1d4ed8",
                          backgroundColor: "#eff6ff",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          border: "1px solid #bfdbfe",
                          display: "inline-block",
                        }}
                      >
                        {item.structureName}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>
                        {item.meaningVi}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "450px" }}>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.4 }}>
                          {item.usageExplanation}
                        </p>
                        {item.exampleJp && (
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              borderLeft: "3px solid #2563eb",
                              marginTop: "4px",
                            }}
                          >
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                              {item.exampleJp}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{item.exampleVi}</div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: "#475569",
                          backgroundColor: "#f8fafc",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "0.82rem",
                        }}
                      >
                        {item.displayOrder}
                      </span>
                    </td>
                    <td>
                      {item.status === "PUBLISHED" ? (
                        <span className="status-badge active">
                          <span className="status-dot active" />
                          ĐÃ XUẤT BẢN
                        </span>
                      ) : item.status === "DRAFT" ? (
                        <span className="status-badge pending">
                          <span className="status-dot pending" />
                          BẢN NHÁP
                        </span>
                      ) : (
                        <span className="status-badge rejected">
                          <span className="status-dot rejected" />
                          {item.status}
                        </span>
                      )}
                    </td>
                    {!readOnly && <td>
                      <div className="row-actions-group" style={{ justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="btn-action edit"
                          title="Chỉnh sửa ngữ pháp"
                          onClick={() => handleOpenEditModal(item)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-action delete"
                          title="Xóa ngữ pháp"
                          onClick={() => setDeletingItem(item)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Create / Edit Grammar */}
      {!readOnly && isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingItem ? "✏️ Chỉnh sửa mẫu ngữ pháp" : "➕ Thêm mẫu ngữ pháp mới"}
              </h3>
              <button
                type="button"
                className="modal-btn-close"
                onClick={() => !submitting && setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitForm} className="modal-form-body">
              <div className="modal-grid-2">
                <div className="modal-field-group">
                  <label className="modal-label">
                    Cấu trúc ngữ pháp <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Ví dụ: ～から～まで"
                    value={formData.structureName}
                    onChange={(e) => setFormData({ ...formData, structureName: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field-group">
                  <label className="modal-label">
                    Ý nghĩa tiếng Việt <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Ví dụ: Từ... đến..."
                    value={formData.meaningVi}
                    onChange={(e) => setFormData({ ...formData, meaningVi: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-field-group">
                <label className="modal-label">
                  Giải thích cách dùng <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  className="modal-textarea"
                  placeholder="Giải thích chi tiết cách kết hợp và ngữ cảnh sử dụng..."
                  rows={3}
                  value={formData.usageExplanation}
                  onChange={(e) => setFormData({ ...formData, usageExplanation: e.target.value })}
                  required
                />
              </div>

              <div className="modal-grid-2">
                <div className="modal-field-group">
                  <label className="modal-label">
                    Ví dụ tiếng Nhật <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Ví dụ: 9時から5時まで働きます。"
                    value={formData.exampleJp}
                    onChange={(e) => setFormData({ ...formData, exampleJp: e.target.value })}
                    required
                  />
                </div>
                <div className="modal-field-group">
                  <label className="modal-label">
                    Ví dụ tiếng Việt <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Ví dụ: Tôi làm việc từ 9 giờ đến 5 giờ."
                    value={formData.exampleVi}
                    onChange={(e) => setFormData({ ...formData, exampleVi: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-grid-2">
                <div className="modal-field-group">
                  <label className="modal-label">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="0"
                    className="modal-input"
                    value={formData.displayOrder ?? 1}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="modal-field-group">
                  <label className="modal-label">Trạng thái phát hành</label>
                  <select
                    className="modal-input"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "DRAFT" | "PUBLISHED" | "HIDDEN" | "ARCHIVED",
                      })
                    }
                  >
                    <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
                    <option value="DRAFT">Bản nháp (DRAFT)</option>
                    <option value="HIDDEN">Ẩn (HIDDEN)</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  style={{ backgroundColor: "#2563eb" }}
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : editingItem ? "Lưu thay đổi" : "Tạo mẫu ngữ pháp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {!readOnly && deletingItem && (
        <div className="modal-overlay" onClick={() => !submitting && setDeletingItem(null)}>
          <div className="modal-card" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa ngữ pháp</h3>
              <button
                type="button"
                className="modal-btn-close"
                onClick={() => !submitting && setDeletingItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">
                Bạn có chắc chắn muốn xóa mẫu ngữ pháp <strong>{deletingItem.structureName}</strong> khỏi bài học này không? Hành động này sẽ xóa dữ liệu vĩnh viễn.
              </p>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  disabled={submitting}
                  onClick={() => setDeletingItem(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn-modal-delete"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                >
                  {submitting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
