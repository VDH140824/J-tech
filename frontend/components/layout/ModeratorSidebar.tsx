import { useNavigate } from "react-router-dom";
import "../layout/AdminSidebar.css";
import "./ModeratorSidebar.css";

// Sakura logo badge matching Dekiru brand
function DekiruModBadgeIcon() {
  return (
    <div className="mod-brand-icon-box">
      <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
        <g transform="translate(20, 20)">
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <path
              key={i}
              transform={`rotate(${angle})`}
              d="M 0 0 C -5 -9, -7 -16, 0 -18 C 7 -16, 5 -9, 0 0 Z"
              fill="#0D9488"
            />
          ))}
          <circle cx="0" cy="0" r="3.5" fill="#F0FDFA" />
          <circle cx="0" cy="0" r="2" fill="#5EEAD4" />
        </g>
      </svg>
    </div>
  );
}

interface ModeratorSidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function ModeratorSidebar({ activeTab, onSelectTab }: ModeratorSidebarProps) {
  const navigate = useNavigate();

  const currentTab = activeTab || "courses";

  const handleNavClick = (tabKey: string, route: string) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
    }
    navigate(route);
  };

  return (
    <aside className="admin-dekiru-sidebar mod-sidebar">
      {/* Brand Header */}
      <div className="admin-sidebar-header" onClick={() => navigate("/home")}>
        <DekiruModBadgeIcon />
        <div className="admin-sidebar-brand-text">
          <div className="brand-name-row">
            <span className="brand-name">J-Tech</span>
            <span className="mod-pill-badge">MOD</span>
          </div>
          <span className="brand-sub">Quản trị nội dung</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="admin-sidebar-menu">
        <button type="button" className={`admin-nav-item ${currentTab === "feedback" ? "active mod-active" : ""}`} onClick={() => handleNavClick("feedback", "/moderator/feedback")}>
          <span className="admin-nav-icon">💬</span><span className="admin-nav-label">Phản hồi nội dung học</span>
        </button>
        <div className="admin-menu-section-label">QUẢN TRỊ NỘI DUNG</div>

        {/* 1. Danh sách môn học */}
        <button
          type="button"
          className={`admin-nav-item ${currentTab === "courses" ? "active mod-active" : ""}`}
          onClick={() => handleNavClick("courses", "/moderator")}
        >
          <span className="admin-nav-icon">📚</span>
          <span className="admin-nav-label">Danh sách môn học</span>
        </button>
      </nav>

      {/* Footer Back Home */}
      <div className="admin-sidebar-bottom">
        <button
          type="button"
          className="admin-btn-back-home"
          onClick={() => navigate("/home")}
        >
          <span>⬅️</span>
          <span>Quay về Trang chủ</span>
        </button>
      </div>
    </aside>
  );
}
