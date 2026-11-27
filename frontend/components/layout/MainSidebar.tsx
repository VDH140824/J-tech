import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { checkIsAdmin, checkIsModerator } from "../../utils/auth";
import { useAuthStore } from "../../store/authStore";
import "./MainSidebar.css";

// SVG Graphic Component for logo
function DekiruLogoIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 3C20 3 23 9.5 28.5 9.5C34 9.5 37 14 34.5 19.5C32 25 26.5 26.5 26.5 26.5C26.5 26.5 27 33 22.5 35.5C18 38 14 34.5 14 34.5C14 34.5 9.5 36.5 6 32.5C2.5 28.5 6.5 23.5 6.5 23.5C6.5 23.5 2.5 18 6 13C9.5 8 15 10 15 10C15 10 16.5 3 20 3Z"
        fill="#FF4B72"
        opacity="0.15"
      />
      {/* 5-Petal Sakura Flower */}
      <g transform="translate(20, 20)">
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <path
            key={i}
            transform={`rotate(${angle})`}
            d="M 0 0 C -5 -9, -7 -16, 0 -18 C 7 -16, 5 -9, 0 0 Z"
            fill="#FF4B72"
          />
        ))}
        <circle cx="0" cy="0" r="3.5" fill="#FFF5F7" />
        <circle cx="0" cy="0" r="2" fill="#FF8CA3" />
      </g>
    </svg>
  );
}

// Icon nét (thiết kế mới), thay cho emoji
const ICON_PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  course: (<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21a2 2 0 0 1 2-2h13" /></>),
  progress: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  conj: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  read: <path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" />,
  listen: (<><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="2" y="14" width="5" height="7" rx="2" /><rect x="17" y="14" width="5" height="7" rx="2" /></>),
  speak: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>),
  game: (<><rect x="2" y="7" width="20" height="12" rx="4" /><path d="M7 11v4M5 13h4M15.5 12h.01M18 14h.01" /></>),
  people: (<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 4a3 3 0 0 1 0 6M21 20c0-2-1.5-4-4-4.6" /></>),
  fire: <path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z" />,
  gift: (<><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1" /></>),
  chat: <path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4a8 8 0 1 1 16-4z" />,
  mod: (<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>),
  admin: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-link-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

export function MainSidebar({
  onOpenFeedback,
}: {
  onOpenFeedback: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const normalizedRole = user?.role?.trim().toUpperCase();
  const normalizedRoleId = String(user?.roleId ?? "");
  const isAdmin = checkIsAdmin(user);
  const isModerator = checkIsModerator(user);
  const isStudentRole =
    normalizedRole === "STUDENT" || normalizedRole === "ROLE_STUDENT" || (!normalizedRole && normalizedRoleId === "1");
  // Giữ đúng điều kiện cũ: mục học tập ẩn với Moderator/Admin; Trò chơi chỉ cho học viên đang hoạt động
  const isStudent = !isAdmin && !isModerator;
  const isActiveStudent = user?.status?.toUpperCase() === "ACTIVE" && isStudentRole;

  function NavItem({ icon, label, to, active }: { icon: string; label: string; to: string; active: boolean }) {
    return (
      <button
        type="button"
        className={`nav-link-btn ${active ? "active" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={() => navigate(to)}
      >
        <NavIcon name={icon} />
        <span className="nav-link-text">{label}</span>
      </button>
    );
  }

  return (
    <aside className="dekiru-sidebar">
      <div className="sidebar-brand" onClick={() => navigate("/home")}>
        <DekiruLogoIcon />
        <div className="brand-titles">
          <span className="dekiru-brand-name">JTech</span>
          <span className="dekiru-brand-sub">できる</span>
        </div>
      </div>

      <nav className="sidebar-nav-menu" aria-label="Điều hướng chính">
        <div className="nav-group">
          {isStudent && <span className="nav-group-label">HỌC TẬP</span>}
          <NavItem icon="home" label="Trang chủ" to="/home" active={location.pathname === "/home"} />
          {isStudent && (
            <>
              <NavItem icon="progress" label="Tiến độ học tập" to="/progress" active={location.pathname === "/progress"} />
              <NavItem icon="conj" label="Thể chia" to="/conjugations" active={location.pathname.startsWith("/conjugations")} />
              <NavItem icon="read" label="Đọc hiểu" to="/ai-reading" active={location.pathname.startsWith("/ai-reading")} />
              <NavItem icon="listen" label="Nghe hiểu" to="/listening" active={location.pathname.startsWith("/listening")} />
              <NavItem icon="speak" label="Luyện nói AI" to="/speaking"
                active={/(^|\/)speaking(\/|$)/.test(location.pathname)} />
              {isActiveStudent && (
                <NavItem icon="game" label="Trò chơi" to="/games" active={location.pathname.startsWith("/games")} />
              )}
            </>
          )}
        </div>

        {isStudent && (
          <div className="nav-group">
            <span className="nav-group-label">CỘNG ĐỒNG &amp; THƯỞNG</span>
            <NavItem icon="people" label="Lớp học của tôi" to="/classes" active={location.pathname.startsWith("/classes")} />
            <NavItem icon="fire" label="Chuỗi ngày học" to="/streak" active={location.pathname === "/streak"} />
            <NavItem icon="gift" label="Cửa hàng đổi quà" to="/store"
              active={["/store", "/inventory", "/coins"].includes(location.pathname)} />
            {isStudentRole && (
              <button
                type="button"
                className={`nav-link-btn sidebar-feedback-btn ${location.pathname === "/feedback" ? "active" : ""}`}
                aria-haspopup="dialog"
                onClick={onOpenFeedback}
              >
                <NavIcon name="chat" />
                <span className="nav-link-text">Phản hồi &amp; Báo lỗi</span>
              </button>
            )}
          </div>
        )}

        {/* MODERATOR PORTAL SPECIAL ITEM (Only visible if user has MODERATOR privileges) */}
        {isModerator && (
          <div className="moderator-nav-wrapper">
            <div className="nav-divider" />
            <button
              type="button"
              className="nav-link-btn moderator-portal-btn"
              onClick={() => navigate("/moderator")}
              title="Truy cập Trang quản trị nội dung"
            >
              <NavIcon name="mod" />
              <span className="nav-link-text">Quản trị nội dung</span>
              <span className="moderator-badge-pill">MOD</span>
            </button>
          </div>
        )}

        {/* ADMIN PORTAL SPECIAL ITEM (Only visible if user has ADMIN privileges) */}
        {isAdmin && (
          <div className="admin-nav-wrapper">
            <div className="nav-divider" />
            <button
              type="button"
              className="nav-link-btn admin-portal-btn"
              onClick={() => navigate("/admin")}
              title="Truy cập Trang quản trị Admin"
            >
              <NavIcon name="admin" />
              <span className="nav-link-text">Quản trị Admin</span>
              <span className="admin-badge-pill">ADMIN</span>
            </button>
          </div>
        )}
      </nav>

    </aside>
  );
}
