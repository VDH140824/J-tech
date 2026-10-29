import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  getLessonsByChapter,
  createLesson,
  updateLesson,
  deleteLesson,
  type LessonSummary,
  type LessonFormInput,
} from "../../api/lessonApi";
import { SECTIONS, type LessonSection, type SectionConfig } from "./sectionConfig";
import { LessonFormModal } from "./LessonFormModal";

interface ModeratorLessonListTabProps {
  courseId?: number;
  courseName: string;
  chapterId: number;
  chapterNo: number;
  chapterTitle: string;
  selectedSection: LessonSection;
  onSelectSection: (section: LessonSection) => void;
  onBackToOverview: () => void;
  onViewLessonItems: (lesson: LessonSummary) => void;
  onOpenChapterFlashcards?: () => void;
  onOpenChapterTest?: () => void;
  readOnly?: boolean;
  publishedLessons?: LessonSummary[];
}

export function ModeratorLessonListTab({
  courseId,
  courseName,
  chapterId,
  chapterNo,
  chapterTitle,
  selectedSection,
  onSelectSection,
  onBackToOverview,
  onViewLessonItems,
  onOpenChapterFlashcards,
  onOpenChapterTest,
  readOnly = false,
  publishedLessons,
}: ModeratorLessonListTabProps) {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonSummary | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<LessonSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeConfig = SECTIONS.find((s) => s.key === selectedSection) || SECTIONS[0];

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = readOnly
        ? (publishedLessons ?? []).filter(lesson => lesson.skillType === activeConfig.skillType && lesson.status === "PUBLISHED")
        : await getLessonsByChapter(chapterId, activeConfig.skillType, statusFilter, courseId);
      setLessons(data);
    } catch (err: unknown) {
      console.error("Lỗi khi tải bài học:", err);
      setError("Không thể tải danh sách bài học từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [chapterId, statusFilter, selectedSection, courseId, readOnly, publishedLessons]);

  // Next lesson number auto-calculation
  const nextLessonNo =
    lessons.length > 0 ? Math.max(...lessons.map((l) => l.lessonNo || 0)) + 1 : 1;

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (readOnly) return;
    setEditingLesson(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (lesson: LessonSummary) => {
    if (readOnly) return;
    setEditingLesson(lesson);
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (formData: LessonFormInput) => {
    if (readOnly) return;
    const payload: LessonFormInput = {
      ...formData,
      skillType: activeConfig.skillType,
    };

    if (editingLesson) {
      await updateLesson(editingLesson.id, payload);
      showNotification(`Đã cập nhật bài học "${formData.title}" thành công!`);
    } else {
      await createLesson(chapterId, payload, courseId);
      showNotification(`Đã thêm bài học "${formData.title}" thành công!`);
    }
    await fetchLessons();
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (readOnly || !deletingLesson) return;
    try {
      setDeleting(true);
      await deleteLesson(deletingLesson.id);
      showNotification(`Đã xóa bài học "${deletingLesson.title}" thành công!`);
      setDeletingLesson(null);
      await fetchLessons();
    } catch (err: unknown) {
      console.error("Lỗi khi xóa bài học:", err);
      alert(isAxiosError(err) && err.response?.status === 409 && typeof err.response.data?.message === "string"
        ? err.response.data.message
        : "Không thể xóa bài học. Vui lòng thử lại!");
    } finally {
      setDeleting(false);
    }
  };

  // Search filter
  const filteredLessons = lessons.filter((lesson) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchTitle = lesson.title.toLowerCase().includes(q);
    const matchDesc = (lesson.description || "").toLowerCase().includes(q);
    const matchNo = `bài ${lesson.lessonNo}`.includes(q) || `${lesson.lessonNo}` === q;
    return matchTitle || matchDesc || matchNo;
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
            backgroundColor: "#0d9488",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(13, 148, 136, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 9999,
            fontWeight: 600,
            fontSize: "0.9rem",
            animation: "slideInRight 0.3s ease-out",
          }}
        >
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Top Breadcrumb Navigation */}
      <div className="mod-chapter-back-row">
        <button
          type="button"
          className="mod-btn-back"
          onClick={onBackToOverview}
        >
          <span>←</span> Quay lại chọn kỹ năng
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo}: {chapterTitle} / {activeConfig.label}
        </span>
      </div>

      {/* Quick Tabs to Switch Between Skills */}
      <div className="mod-skill-tabs-nav" style={{ marginBottom: "16px" }}>
        {SECTIONS.map((sec) => {
          const isActive = sec.key === selectedSection;
          return (
            <button
              key={sec.key}
              type="button"
              className={`mod-skill-tab-btn ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? {
                      backgroundColor: sec.bgColor,
                      color: sec.color,
                      borderColor: sec.borderColor,
                    }
                  : {}
              }
              onClick={() => onSelectSection(sec.key)}
            >
              <span style={{ fontSize: "1.1rem" }}>{sec.icon}</span>
              <span>{sec.label}</span>
              <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>({sec.labelJp})</span>
            </button>
          );
        })}
      </div>

      {/* Section Header with "➕ Thêm bài học" */}
      <div className="admin-page-header">
        <div className={`mod-header-action-row ${activeConfig.key === "vocabulary" ? "mod-vocab-header-actions" : ""}`} style={{ width: "100%" }}>
          <div className="admin-header-titles">
            <h2 className="admin-main-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{activeConfig.icon}</span>
              <span>
                {readOnly ? "Bài học" : "Quản lý bài học"} {activeConfig.label} ({activeConfig.labelJp})
              </span>
            </h2>
            <p className="admin-main-subtitle">
              {readOnly ? `Chương ${chapterNo}: ${chapterTitle} — Danh sách bài học ${activeConfig.label}.` : <>Chương {chapterNo}: {chapterTitle} — Danh sách bài học từ bảng{" "}<code>lesson</code> (skill: <strong>{activeConfig.skillType}</strong>).</>}
            </p>
          </div>
          {activeConfig.key === "vocabulary" && onOpenChapterFlashcards && <button type="button" className="mod-btn-back" onClick={onOpenChapterFlashcards}>Flashcard tổng hợp chương</button>}
          {activeConfig.key === "vocabulary" && onOpenChapterTest && <button type="button" className="mod-btn-back" onClick={onOpenChapterTest}>Bài test chương Vocab</button>}
          {!readOnly && <button
            type="button"
            className="mod-btn-add"
            style={{
              backgroundColor: activeConfig.color,
              padding: "11px 22px",
              fontSize: "0.92rem",
            }}
            onClick={handleOpenCreateModal}
          >
            <span>➕</span> Thêm bài học
          </button>}
        </div>
      </div>

      {/* Toolbar: Search, Status Filter & Count */}
      <div className="mod-section-toolbar">
        <div className="mod-toolbar-left">
          <div className="mod-toolbar-search">
            <span className="search-mag-icon">🔍</span>
            <input
              type="text"
              placeholder={`Tìm kiếm trong bài học ${activeConfig.label}...`}
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
            <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
          </select>}
        </div>
        <div style={{ fontSize: "0.86rem", color: "#64748b", fontWeight: 600 }}>
          Hiển thị <strong>{filteredLessons.length}</strong> bài học {activeConfig.label}
        </div>
      </div>

      {/* Table Content */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-loading-state">
            <div
              className="admin-loading-spinner"
              style={{ borderTopColor: activeConfig.color }}
            />
            <p className="admin-loading-text">
              Đang tải danh sách bài học {activeConfig.label}...
            </p>
          </div>
        ) : error ? (
          <div className="admin-empty-state">
            <span style={{ fontSize: "2rem" }}>⚠️</span>
            <h3 className="admin-empty-title">Không thể tải bài học</h3>
            <p className="admin-empty-desc">{error}</p>
            <button
              type="button"
              className="mod-btn-add"
              style={{ backgroundColor: activeConfig.color, margin: "14px auto 0" }}
              onClick={fetchLessons}
            >
              Thử lại
            </button>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="admin-empty-state">
            <h3 className="admin-empty-title">Chưa có bài học nào</h3>
            <p className="admin-empty-desc">
              {readOnly ? "Chưa có bài học được xuất bản phù hợp với lựa chọn này." : searchQuery || statusFilter !== "ALL"
                ? "Không tìm thấy bài học nào phù hợp với bộ lọc hiện tại."
                : `Chưa có bài học nào trong phần ${activeConfig.label}. Nhấn nút "Thêm bài học" để bắt đầu.`}
            </p>
            {!readOnly && <button
              type="button"
              className="mod-btn-add"
              style={{ backgroundColor: activeConfig.color, margin: "16px auto 0" }}
              onClick={handleOpenCreateModal}
            >
              <span>➕</span> Thêm bài học
            </button>}
          </div>
        ) : (
          <div className="table-responsive mod-lesson-table-wrap">
            <table className="admin-users-table mod-lesson-table">
              <thead>
                <tr>
                  <th className="lesson-col-index">STT</th>
                  <th className="lesson-col-number">SỐ BÀI</th>
                  <th className="lesson-col-title">TIÊU ĐỀ BÀI HỌC</th>
                  <th className="lesson-col-description">NỘI DUNG BÀI HỌC</th>
                  <th className="lesson-col-status">TRẠNG THÁI</th>
                  <th className="lesson-col-order">THỨ TỰ</th>
                  <th className="lesson-col-actions">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.map((lesson, idx) => (
                  <tr key={lesson.id}>
                    <td>
                      <span className="mod-lesson-row-index">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td>
                      <span
                        className="mod-lesson-badge"
                        style={{
                          color: activeConfig.color,
                          backgroundColor: activeConfig.bgColor,
                          borderColor: activeConfig.borderColor,
                        }}
                      >
                        {lesson.lessonNo}
                      </span>
                    </td>
                    <td>
                      {activeConfig.key === "vocabulary" ? (
                        <button type="button" className="mod-vocab-lesson-link" onClick={() => onViewLessonItems(lesson)}>{lesson.title}</button>
                      ) : <span className="mod-lesson-main-title">{lesson.title}</span>}
                    </td>
                    <td className="mod-lesson-description-cell">
                      {lesson.description?.trim() || "—"}
                    </td>
                    <td>
                      {lesson.status === "PUBLISHED" ? (
                        <span className="status-badge active mod-lesson-status">
                          <span className="status-dot active" />
                          ĐÃ XUẤT BẢN
                        </span>
                      ) : lesson.status === "DRAFT" ? (
                        <span className="status-badge pending mod-lesson-status">
                          <span className="status-dot pending" />
                          BẢN NHÁP
                        </span>
                      ) : (
                        <span className="status-badge rejected mod-lesson-status">
                          <span className="status-dot rejected" />
                          {lesson.status}
                        </span>
                      )}
                    </td>
                    <td className="lesson-order-cell">
                      <span className="lesson-order-pill">{lesson.displayOrder}</span>
                    </td>
                    <td>
                      <div className="row-actions-group" style={{ justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          type="button"
                          className="mod-btn-view-items lesson-items-action"
                          style={{
                            backgroundColor: activeConfig.bgColor,
                            color: activeConfig.color,
                            borderColor: activeConfig.borderColor,
                          }}
                          title={`Xem ${activeConfig.itemButtonLabel}`}
                          onClick={() => onViewLessonItems(lesson)}
                        >
                          <span>{activeConfig.icon}</span>
                          <span>{activeConfig.key === "vocabulary" ? "Mở bài học" : activeConfig.itemButtonLabel}</span>
                        </button>

                        {!readOnly && <><button
                          type="button"
                          className={`btn-action edit ${activeConfig.key === "vocabulary" ? "mod-vocab-text-action" : ""}`}
                          title="Chỉnh sửa bài học"
                          onClick={() => handleOpenEditModal(lesson)}
                        >
                          {activeConfig.key === "vocabulary" ? "Sửa" : "✏️"}
                        </button>
                        <button
                          type="button"
                          className={`btn-action delete ${activeConfig.key === "vocabulary" ? "mod-vocab-text-action" : ""}`}
                          title="Xóa bài học"
                          onClick={() => setDeletingLesson(lesson)}
                        >
                          {activeConfig.key === "vocabulary" ? "Xóa" : "🗑️"}
                        </button></>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lesson Create / Edit Modal */}
      {!readOnly && <LessonFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitForm}
        editingLesson={editingLesson}
        skillLabel={activeConfig.label}
        skillType={activeConfig.skillType}
        skillColor={activeConfig.color}
        defaultLessonNo={nextLessonNo}
      />}

      {/* Delete Confirmation Modal */}
      {!readOnly && deletingLesson && (
        <div className="modal-overlay" onClick={() => !deleting && setDeletingLesson(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Xác nhận xóa bài học</h3>
              <button
                type="button"
                className="modal-btn-close"
                disabled={deleting}
                onClick={() => setDeletingLesson(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">
                Bạn có chắc chắn muốn xóa bài học{" "}
                <strong>
                  Bài {deletingLesson.lessonNo}: {deletingLesson.title}
                </strong>{" "}
                khỏi chương này không? {activeConfig.key === "vocabulary"
                  ? "Thông tin bài học sẽ bị xóa. Các từ vựng được giữ nguyên trong hệ thống và gỡ khỏi bài này để có thể gán sang bài khác."
                  : "Hành động này sẽ xóa dữ liệu bài học này khỏi hệ thống."}
              </p>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  disabled={deleting}
                  onClick={() => setDeletingLesson(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  className="btn-modal-delete"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                >
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
