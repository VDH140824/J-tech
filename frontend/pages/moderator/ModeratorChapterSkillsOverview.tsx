import { SECTIONS, type LessonSection } from "./sectionConfig";

interface ModeratorChapterSkillsOverviewProps {
  courseName: string;
  chapterNo: number;
  chapterTitle: string;
  onSelectSkill: (skill: LessonSection) => void;
  onBack: () => void;
  readOnly?: boolean;
}

export function ModeratorChapterSkillsOverview({
  courseName,
  chapterNo,
  chapterTitle,
  onSelectSkill,
  onBack,
  readOnly = false,
}: ModeratorChapterSkillsOverviewProps) {
  return (
    <div className="admin-page-container">
      {/* Top Breadcrumb Navigation */}
      <div className="mod-chapter-back-row">
        <button
          type="button"
          className="mod-btn-back"
          onClick={onBack}
        >
          <span>←</span> Quay lại danh sách môn học
        </button>
        <span className="mod-chapter-breadcrumb-pill">
          {courseName} / Chương {chapterNo}: {chapterTitle}
        </span>
      </div>

      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">
            📖 Chương {chapterNo}: {chapterTitle}
          </h2>
          <p className="admin-main-subtitle">
            Chọn kỹ năng {readOnly ? "để học" : "cần quản lý bài học"} trong <strong>{courseName}</strong> (Kanji, Từ vựng, Ngữ pháp, Nghe, Đọc hiểu).
          </p>
        </div>
      </div>

      {/* Grid 5 cards */}
      <div className="mod-skills-grid">
        {SECTIONS.map((sec) => (
          <div
            key={sec.key}
            className="mod-skill-choice-card"
            style={{
              borderLeft: `5px solid ${sec.color}`,
            }}
            onClick={() => onSelectSkill(sec.key)}
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
                onSelectSkill(sec.key);
              }}
            >
              Vào bài học →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
