import { SECTIONS, type LessonSection } from "./sectionConfig";

interface ModeratorChapterSkillsOverviewProps {
  courseName: string;
  chapterNo: number;
  chapterTitle: string;
  onSelectSkill: (skill: LessonSection) => void;
  onBack: () => void;
  readOnly?: boolean;
  /** Shows the AI speaking practice card when provided (learner view only). */
  onOpenSpeaking?: () => void;
}

const SPEAKING_CARD = {
  icon: "🗣️",
  label: "Luyện nói",
  labelJp: "会話",
  description: "Nhập vai hội thoại với AI, chấm phát âm từng từ",
  color: "#db2777",
  bgColor: "#fdf2f8",
  borderColor: "#fbcfe8",
};

export function ModeratorChapterSkillsOverview({
  courseName,
  chapterNo,
  chapterTitle,
  onSelectSkill,
  onBack,
  readOnly = false,
  onOpenSpeaking,
}: ModeratorChapterSkillsOverviewProps) {
  const cards = [
    ...SECTIONS.map((sec) => ({
      ...sec,
      isNew: false,
      action: "Vào bài học →",
      open: () => onSelectSkill(sec.key),
    })),
    ...(onOpenSpeaking
      ? [
          {
            ...SPEAKING_CARD,
            key: "speaking",
            isNew: true,
            action: "Chọn tình huống →",
            open: onOpenSpeaking,
          },
        ]
      : []),
  ];
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
            Chọn kỹ năng {readOnly ? "để học" : "cần quản lý bài học"} trong{" "}
            <strong>{courseName}</strong> (Kanji, Từ vựng, Ngữ pháp, Nghe, Đọc hiểu
            {onOpenSpeaking ? ", Luyện nói" : ""}).
          </p>
        </div>
      </div>

      {/* Skill cards, plus the speaking card in the learner view */}
      <div className="mod-skills-grid">
        {cards.map((sec) => (
          <div
            key={sec.key}
            className="mod-skill-choice-card"
            style={{
              borderLeft: `5px solid ${sec.color}`,
            }}
            onClick={sec.open}
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
                  {sec.isNew && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#ffffff",
                        backgroundColor: sec.color,
                        borderRadius: "999px",
                        padding: "2px 8px",
                      }}
                    >
                      Mới
                    </span>
                  )}
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
                sec.open();
              }}
            >
              {sec.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
