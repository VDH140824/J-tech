import { useEffect, useState } from "react";
import {
  getLessonsByChapter,
  createLesson,
  updateLesson,
  deleteLesson,
  type LessonSummary,
  type LessonFormInput,
  type SkillType,
} from "../../api/lessonApi";
import { ModeratorGrammarListPage } from "./ModeratorGrammarListPage";
import { ModeratorSkillItemListPage } from "./ModeratorSkillItemListPage";

export type LessonSection = "kanji" | "vocabulary" | "grammar" | "listening" | "reading";

export interface SectionConfig {
  key: LessonSection;
  skillType: SkillType;
  label: string;
  labelJp: string;
  itemButtonLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export const SECTIONS: SectionConfig[] = [
  {
    key: "kanji",
    skillType: "KANJI",
    label: "Kanji",
    labelJp: "漢字",
    itemButtonLabel: "Danh sách Kanji",
    icon: "🈳",
    color: "#dc2626",
    bgColor: "#fef2f2",
    borderColor: "#fecaca",
    description: "Quản lý danh sách các bài học Hán tự của chương",
  },
  {
    key: "vocabulary",
    skillType: "VOCABULARY",
    label: "Từ vựng",
    labelJp: "語彙",
    itemButtonLabel: "Danh sách từ vựng",
    icon: "📕",
    color: "#0d9488",
    bgColor: "#f0fdfa",
    borderColor: "#99f6e4",
    description: "Quản lý danh sách các bài học Từ vựng của chương",
  },
  {
    key: "grammar",
    skillType: "GRAMMAR",
    label: "Ngữ pháp",
    labelJp: "文法",
    itemButtonLabel: "Danh sách ngữ pháp",
    icon: "📄",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    description: "Quản lý danh sách các bài học Ngữ pháp của chương",
  },
  {
    key: "listening",
    skillType: "LISTENING",
    label: "Nghe",
    labelJp: "聴解",
    itemButtonLabel: "Danh sách bài nghe",
    icon: "🎧",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#c4b5fd",
    description: "Quản lý danh sách các bài học Nghe hiểu của chương",
  },
  {
    key: "reading",
    skillType: "READING",
    label: "Đọc hiểu",
    labelJp: "読解",
    itemButtonLabel: "Danh sách bài đọc",
    icon: "📖",
    color: "#ea580c",
    bgColor: "#fff7ed",
    borderColor: "#fed7aa",
    description: "Quản lý danh sách các bài học Đọc hiểu của chương",
  },
];

interface ModeratorChapterDetailPageProps {
  courseId: number;
  courseName: string;
  chapterId: number;
  chapterNo: number;
  chapterTitle: string;
  onBack: () => void;
}

export function ModeratorChapterDetailPage({
  courseName,
  chapterId,
  chapterNo,
  chapterTitle,
  onBack,
}: ModeratorChapterDetailPageProps) {
  // Selected skill: null means skill overview, or one of 5 skills
  const [selectedSection, setSelectedSection] = useState<LessonSection | null>(null);

  // When a lesson is clicked for viewing its items (e.g. list_grammar)
  const [activeLessonForItems, setActiveLessonForItems] = useState<LessonSummary | null>(null);

  // Lesson data from database (filtered by chapterId and skillType)
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
  const [submitting, setSubmitting] = useState(false);

  const activeConfig = SECTIONS.find((s) => s.key === selectedSection);

  // Form input state
  const [formData, setFormData] = useState<LessonFormInput>({
    skillType: activeConfig?.skillType || "GRAMMAR",
    lessonNo: 1,
    title: "",
    description: "",
    displayOrder: 1,
    status: "PUBLISHED",
  });

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const fetchLessons = async () => {
    if (!activeConfig) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getLessonsByChapter(chapterId, activeConfig.skillType, statusFilter);
      setLessons(data);
    } catch (err: unknown) {
      console.error("Lỗi khi tải bài học:", err);
      setError("Không thể tải danh sách bài học từ máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSection) {
      fetchLessons();
    }
  }, [chapterId, statusFilter, selectedSection]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (!activeConfig) return;
    setEditingLesson(null);
    const nextLessonNo = lessons.length > 0 ? Math.max(...lessons.map((l) => l.lessonNo || 0)) + 1 : 1;
    setFormData({
      skillType: activeConfig.skillType,
      lessonNo: nextLessonNo,
      title: "",
      description: "",
      displayOrder: nextLessonNo,
      status: "PUBLISHED",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (lesson: LessonSummary) => {
    setEditingLesson(lesson);
    setFormData({
      skillType: lesson.skillType,
      lessonNo: lesson.lessonNo,
      title: lesson.title,
      description: lesson.description || "",
      displayOrder: lesson.displayOrder,
      status: lesson.status,
    });
    setIsModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Vui lòng nhập tiêu đề bài học!");
      return;
    }

    try {
      setSubmitting(true);
      if (editingLesson) {
        await updateLesson(editingLesson.id, formData);
        showNotification(`Đã cập nhật bài học "${formData.title}" thành công!`);
      } else {
        await createLesson(chapterId, formData);
        showNotification(`Đã thêm bài học "${formData.title}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingLesson(null);
      await fetchLessons();
    } catch (err: unknown) {
      console.error("Lỗi khi lưu bài học:", err);
      alert("Đã xảy ra lỗi khi lưu bài học. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Lesson
  const handleConfirmDelete = async () => {
    if (!deletingLesson) return;
    try {
      setSubmitting(true);
      await deleteLesson(deletingLesson.id);
      showNotification(`Đã xóa bài học "${deletingLesson.title}" thành công!`);
      setDeletingLesson(null);
      await fetchLessons();
    } catch (err: unknown) {
      console.error("Lỗi khi xóa bài học:", err);
      alert("Không thể xóa bài học. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
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

  // SUB-PAGE: LIST OF ITEMS FOR A SPECIFIC LESSON (e.g. list_grammar)
  if (activeLessonForItems && activeConfig) {
    if (activeConfig.key === "grammar") {
      return (
        <ModeratorGrammarListPage
          courseName={courseName}
          chapterNo={chapterNo}
          chapterTitle={chapterTitle}
          lesson={activeLessonForItems}
          onBack={() => setActiveLessonForItems(null)}
        />
      );
    } else {
      return (
        <ModeratorSkillItemListPage
          skillType={activeConfig.skillType}
          skillLabel={activeConfig.label}
          skillIcon={activeConfig.icon}
          skillColor={activeConfig.color}
          courseName={courseName}
          chapterNo={chapterNo}
          chapterTitle={chapterTitle}
          lesson={activeLessonForItems}
          onBack={() => setActiveLessonForItems(null)}
        />
      );
    }
  }

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
          onClick={selectedSection ? () => setSelectedSection(null) : onBack}
        >
          <span>←</span> {selectedSection ? "Quay lại chọn kỹ năng" : "Quay lại danh sách môn học"}
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo}: {chapterTitle}
          {activeConfig && ` / ${activeConfig.label}`}
        </span>
      </div>

      {/* VIEW 1: SKILL SELECTION BUTTONS (Kanji, Từ vựng, Ngữ pháp, Nghe, Đọc hiểu) */}
      {!selectedSection ? (
        <>
          <div className="admin-page-header">
            <div className="admin-header-titles">
              <h2 className="admin-main-title">
                📖 Chương {chapterNo}: {chapterTitle}
              </h2>
              <p className="admin-main-subtitle">
                Chọn kỹ năng cần quản lý bài học trong <strong>{courseName}</strong> (Kanji, Từ vựng, Ngữ pháp, Nghe, Đọc hiểu).
              </p>
            </div>
          </div>

          <div className="mod-skills-grid">
            {SECTIONS.map((sec) => (
              <div
                key={sec.key}
                className="mod-skill-choice-card"
                style={{
                  borderLeft: `5px solid ${sec.color}`,
                }}
                onClick={() => setSelectedSection(sec.key)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "14px",
                      backgroundColor: sec.bgColor,
                      border: `1.5px solid ${sec.borderColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      flexShrink: 0,
                    }}
                  >
                    <span>{sec.icon}</span>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.15rem",
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {sec.label}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.86rem",
                          fontWeight: 700,
                          color: sec.color,
                        }}
                      >
                        {sec.labelJp}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "0.82rem",
                        color: "#64748b",
                        lineHeight: 1.4,
                      }}
                    >
                      {sec.description}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mod-btn-add"
                  style={{
                    backgroundColor: sec.color,
                    padding: "9px 16px",
                    fontSize: "0.84rem",
                    borderRadius: "10px",
                    whiteSpace: "nowrap",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSection(sec.key);
                  }}
                >
                  Vào bài học →
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* VIEW 2: LESSON MANAGEMENT TABLE WITH BUTTON "Thêm bài học" & "Danh sách ngữ pháp" */
        <>
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
                  onClick={() => setSelectedSection(sec.key)}
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
            <div className="mod-header-action-row" style={{ width: "100%" }}>
              <div className="admin-header-titles">
                <h2 className="admin-main-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>{activeConfig?.icon}</span>
                  <span>
                    Quản lý bài học {activeConfig?.label} ({activeConfig?.labelJp})
                  </span>
                </h2>
                <p className="admin-main-subtitle">
                  Chương {chapterNo}: {chapterTitle} — Danh sách bài học tải từ bảng{" "}
                  <code>lesson</code> (skill: <strong>{activeConfig?.skillType}</strong>).
                </p>
              </div>
              <button
                type="button"
                className="mod-btn-add"
                style={{
                  backgroundColor: activeConfig?.color || "#0d9488",
                  padding: "11px 22px",
                  fontSize: "0.92rem",
                }}
                onClick={handleOpenCreateModal}
              >
                <span>➕</span> Thêm bài học
              </button>
            </div>
          </div>

          {/* Toolbar: Search, Status Filter & Count */}
          <div className="mod-section-toolbar">
            <div className="mod-toolbar-left">
              <div className="mod-toolbar-search">
                <span className="search-mag-icon">🔍</span>
                <input
                  type="text"
                  placeholder={`Tìm kiếm trong bài học ${activeConfig?.label}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="mod-toolbar-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PUBLISHED">Đã xuất bản (PUBLISHED)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="HIDDEN">Ẩn (HIDDEN)</option>
                <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
              </select>
            </div>
            <div style={{ fontSize: "0.86rem", color: "#64748b", fontWeight: 600 }}>
              Hiển thị <strong>{filteredLessons.length}</strong> bài học {activeConfig?.label}
            </div>
          </div>

          {/* Table Content */}
          <div className="admin-table-card">
            {loading ? (
              <div className="admin-loading-state">
                <div
                  className="admin-loading-spinner"
                  style={{ borderTopColor: activeConfig?.color || "#0d9488" }}
                />
                <p className="admin-loading-text">
                  Đang tải danh sách bài học {activeConfig?.label}...
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
                  style={{ backgroundColor: activeConfig?.color || "#0d9488", margin: "14px auto 0" }}
                  onClick={fetchLessons}
                >
                  Thử lại
                </button>
              </div>
            ) : filteredLessons.length === 0 ? (
              <div className="admin-empty-state">
                <span style={{ fontSize: "2.4rem" }}>📭</span>
                <h3 className="admin-empty-title">Chưa có bài học nào</h3>
                <p className="admin-empty-desc">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Không tìm thấy bài học nào phù hợp với bộ lọc hiện tại."
                    : `Chưa có bài học nào trong phần ${activeConfig?.label}. Nhấn nút "Thêm bài học" để bắt đầu.`}
                </p>
                <button
                  type="button"
                  className="mod-btn-add"
                  style={{ backgroundColor: activeConfig?.color || "#0d9488", margin: "16px auto 0" }}
                  onClick={handleOpenCreateModal}
                >
                  <span>➕</span> Thêm bài học
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>TT</th>
                      <th style={{ width: "100px" }}>Số bài</th>
                      <th>Tiêu đề &amp; Mô tả bài học</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Thứ tự</th>
                      <th style={{ width: "140px" }}>Trạng thái</th>
                      <th style={{ width: "240px", textAlign: "right" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLessons.map((lesson, idx) => (
                      <tr key={lesson.id}>
                        <td>
                          <span className="row-index">#{idx + 1}</span>
                        </td>
                        <td>
                          <span
                            className="mod-lesson-badge"
                            style={{
                              color: activeConfig?.color,
                              backgroundColor: activeConfig?.bgColor,
                              borderColor: activeConfig?.borderColor,
                              fontWeight: 800,
                              fontSize: "0.9rem",
                            }}
                          >
                            {lesson.lessonNo}
                          </span>
                        </td>
                        <td>
                          <div className="mod-lesson-title-cell">
                            <span className="mod-lesson-main-title">{lesson.title}</span>
                            {lesson.description && (
                              <span className="mod-lesson-main-desc">{lesson.description}</span>
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
                            {lesson.displayOrder}
                          </span>
                        </td>
                        <td>
                          {lesson.status === "PUBLISHED" ? (
                            <span className="status-badge active">
                              <span className="status-dot active" />
                              ĐÃ XUẤT BẢN
                            </span>
                          ) : lesson.status === "DRAFT" ? (
                            <span className="status-badge pending">
                              <span className="status-dot pending" />
                              BẢN NHÁP
                            </span>
                          ) : (
                            <span className="status-badge rejected">
                              <span className="status-dot rejected" />
                              {lesson.status}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="row-actions-group" style={{ justifyContent: "flex-end", gap: "8px" }}>
                            {/* DEDICATED BUTTON TO OPEN THE ITEMS OF THIS SKILL (e.g. list_grammar) */}
                            <button
                              type="button"
                              className="mod-btn-view-items"
                              style={{
                                backgroundColor: activeConfig?.bgColor,
                                color: activeConfig?.color,
                                borderColor: activeConfig?.borderColor,
                              }}
                              title={`Xem ${activeConfig?.itemButtonLabel}`}
                              onClick={() => setActiveLessonForItems(lesson)}
                            >
                              <span>{activeConfig?.icon}</span>
                              <span>{activeConfig?.itemButtonLabel}</span>
                            </button>

                            <button
                              type="button"
                              className="btn-action edit"
                              title="Chỉnh sửa bài học"
                              onClick={() => handleOpenEditModal(lesson)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-action delete"
                              title="Xóa bài học"
                              onClick={() => setDeletingLesson(lesson)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create / Edit Lesson Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editingLesson
                  ? "Chỉnh sửa bài học"
                  : `➕ Thêm bài học mới (${activeConfig?.label || "Bài học"})`}
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
                    Số bài học (lesson_no) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="modal-input"
                    placeholder="Ví dụ: 1, 2, 3..."
                    value={formData.lessonNo}
                    onChange={(e) => {
                      const num = parseInt(e.target.value) || 1;
                      setFormData({
                        ...formData,
                        lessonNo: num,
                        displayOrder: num,
                      });
                    }}
                    required
                  />
                </div>
                <div className="modal-field-group">
                  <label className="modal-label">Thứ tự hiển thị (display_order)</label>
                  <input
                    type="number"
                    min="0"
                    className="modal-input"
                    value={formData.displayOrder ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="modal-field-group">
                <label className="modal-label">
                  Tiêu đề bài học <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Nhập tên bài học (Ví dụ: Học ăn, Chào hỏi và giới thiệu...)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="modal-field-group">
                <label className="modal-label">Mô tả tóm tắt bài học</label>
                <textarea
                  className="modal-textarea"
                  placeholder="Mô tả mục tiêu, kiến thức trọng tâm của bài học này..."
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                </select>
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
                  style={{ backgroundColor: activeConfig?.color || "#0d9488" }}
                  disabled={submitting}
                >
                  {submitting ? "Đang lưu..." : editingLesson ? "Lưu thay đổi" : "Tạo bài học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLesson && (
        <div className="modal-overlay" onClick={() => !submitting && setDeletingLesson(null)}>
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
                onClick={() => !submitting && setDeletingLesson(null)}
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
                khỏi chương này không? Hành động này sẽ xóa dữ liệu bài học này khỏi hệ thống.
              </p>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  disabled={submitting}
                  onClick={() => setDeletingLesson(null)}
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
