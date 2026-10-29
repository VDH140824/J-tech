import { useState } from "react";
import type { LessonSummary, SkillType } from "../../api/lessonApi";

interface ModeratorSkillItemListPageProps {
  skillType: SkillType;
  skillLabel: string;
  skillIcon: string;
  skillColor: string;
  courseName: string;
  chapterNo: number;
  chapterTitle: string;
  lesson: LessonSummary;
  onBack: () => void;
  readOnly?: boolean;
}

export function ModeratorSkillItemListPage({
  skillLabel,
  skillIcon,
  skillColor,
  courseName,
  chapterNo,
  lesson,
  onBack,
  readOnly = false,
}: ModeratorSkillItemListPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  return (
    <div className="admin-page-container">
      {/* Top Breadcrumb Row */}
      <div className="mod-chapter-back-row">
        <button type="button" className="mod-btn-back" onClick={onBack}>
          <span>←</span> Quay lại danh sách bài học
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo} / {skillLabel} / Bài {lesson.lessonNo}: {lesson.title}
        </span>
      </div>

      {/* Header */}
      <div className="admin-page-header">
        <div className="mod-header-action-row" style={{ width: "100%" }}>
          <div className="admin-header-titles">
            <h2 className="admin-main-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{skillIcon}</span>
              <span>Danh sách {skillLabel} - Bài {lesson.lessonNo}</span>
            </h2>
            <p className="admin-main-subtitle">
              Quản lý chi tiết các nội dung thuộc <strong>Bài {lesson.lessonNo}: {lesson.title}</strong>
            </p>
          </div>
          {!readOnly && <button
            type="button"
            className="mod-btn-add"
            style={{ backgroundColor: skillColor, padding: "11px 22px" }}
            onClick={() => alert(`Tính năng thêm mới cho phần ${skillLabel} đang được hoàn thiện!`)}
          >
            <span>➕</span> Thêm {skillLabel} mới
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
              placeholder={`Tìm kiếm trong ${skillLabel}...`}
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
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="HIDDEN">Ẩn</option>
          </select>}
        </div>
        <div style={{ fontSize: "0.86rem", color: "#64748b", fontWeight: 600 }}>
          Hiển thị <strong>0</strong> mục
        </div>
      </div>

      {/* Empty State */}
      <div className="admin-table-card">
        <div className="admin-empty-state">
          <span style={{ fontSize: "2.4rem" }}>📭</span>
          <h3 className="admin-empty-title">Chưa có dữ liệu {skillLabel}</h3>
          <p className="admin-empty-desc">
            Bài {lesson.lessonNo} chưa có dữ liệu {skillLabel}.{!readOnly && <> Nhấn "Thêm {skillLabel} mới" để bắt đầu thêm nội dung.</>}
          </p>
          {!readOnly && <button
            type="button"
            className="mod-btn-add"
            style={{ backgroundColor: skillColor, margin: "16px auto 0" }}
            onClick={() => alert(`Tính năng thêm mới cho phần ${skillLabel} đang được hoàn thiện!`)}
          >
            <span>➕</span> Thêm {skillLabel} mới
          </button>}
        </div>
      </div>
    </div>
  );
}
