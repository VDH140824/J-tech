import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import "./MainSidebar.css";

// SVG Graphic Component for logo
function DekiruLogoIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function SidebarCatDecoration() {
  return (
    <div className="sidebar-cat-widget">
      <svg width="180" height="130" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Sakura Branch */}
        <path d="M 0 30 C 50 20, 90 45, 140 15 C 160 5, 180 10, 200 0" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 28 C 90 10, 110 5, 125 0" stroke="#78350F" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        <path d="M 120 20 C 135 30, 150 35, 165 30" stroke="#78350F" strokeWidth="2" strokeLinecap="round" opacity="0.3" />

        {/* Sakura Flowers on Branch */}
        <circle cx="65" cy="24" r="7" fill="#FF8CA3" opacity="0.8" />
        <circle cx="65" cy="24" r="3" fill="#FFF" />
        <circle cx="100" cy="12" r="8" fill="#FF4B72" opacity="0.85" />
        <circle cx="100" cy="12" r="3.5" fill="#FFF" />
        <circle cx="140" cy="15" r="7.5" fill="#FF8CA3" opacity="0.8" />
        <circle cx="140" cy="15" r="3" fill="#FFF" />
        <circle cx="155" cy="32" r="6" fill="#FF4B72" opacity="0.75" />
        <circle cx="180" cy="8" r="7" fill="#FF8CA3" opacity="0.8" />

        {/* Cute Neko / Kitten Sitting */}
        <g transform="translate(60, 45)">
          {/* Tail */}
          <path d="M 75 75 Q 95 70 90 50 Q 85 45 80 52" stroke="#475569" strokeWidth="6" strokeLinecap="round" fill="none" />
          {/* Body */}
          <ellipse cx="50" cy="65" rx="28" ry="24" fill="#FFFFFF" stroke="#334155" strokeWidth="3.5" />
          {/* Paws */}
          <ellipse cx="36" cy="84" rx="8" ry="5" fill="#FFFFFF" stroke="#334155" strokeWidth="3" />
          <ellipse cx="64" cy="84" rx="8" ry="5" fill="#FFFFFF" stroke="#334155" strokeWidth="3" />
          {/* Head */}
          <circle cx="50" cy="38" r="25" fill="#FFFFFF" stroke="#334155" strokeWidth="3.5" />
          {/* Ears */}
          <path d="M 30 24 L 20 4 L 40 17 Z" fill="#FFFFFF" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 31 22 L 24 9 L 38 18 Z" fill="#FFB1C1" />
          <path d="M 70 24 L 80 4 L 60 17 Z" fill="#FFFFFF" stroke="#334155" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 69 22 L 76 9 L 61 17 Z" fill="#FFB1C1" />
          {/* Eyes (Happy Closed Curves) */}
          <path d="M 37 36 Q 42 30 46 36" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 54 36 Q 58 30 63 36" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Nose & Mouth */}
          <polygon points="50,40 48,42 52,42" fill="#FF7E95" />
          <path d="M 46 44 Q 50 47 54 44" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Cheeks */}
          <ellipse cx="34" cy="40" rx="5" ry="3" fill="#FFB1C1" opacity="0.7" />
          <ellipse cx="66" cy="40" rx="5" ry="3" fill="#FFB1C1" opacity="0.7" />
          {/* Open Japanese Book */}
          <path d="M 28 72 Q 50 68 50 78 Q 50 68 72 72 L 72 84 Q 50 80 50 86 Q 50 80 28 84 Z" fill="#FFEFF3" stroke="#F43F5E" strokeWidth="2" />
        </g>
      </svg>
      <div className="cat-japanese-text">がんばりましょう</div>
    </div>
  );
}

export function MainSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState("trang-chu");

  const normalizedRole = user?.role?.trim().toUpperCase();
  const normalizedRoleId = String(user?.roleId ?? "");
  const isAdmin =
    normalizedRoleId === "1" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "ROLE_ADMIN";

  const isHomeActive = location.pathname === "/home" || activeTab === "trang-chu";

  return (
    <aside className="dekiru-sidebar">
      <div className="sidebar-brand" onClick={() => navigate("/home")}>
        <DekiruLogoIcon />
        <div className="brand-titles">
          <span className="dekiru-brand-name">Dekiru</span>
          <span className="dekiru-brand-sub">できる</span>
        </div>
      </div>
      <div className="sidebar-tagline">Luyện tiếng Nhật cùng Dekiru</div>

      <nav className="sidebar-nav-menu">
        <button
          type="button"
          className={`nav-link-btn ${isHomeActive ? "active" : ""}`}
          onClick={() => {
            setActiveTab("trang-chu");
            navigate("/home");
          }}
        >
          <span className="nav-link-icon">🌸</span>
          <span className="nav-link-text">Trang chủ</span>
        </button>

        <button
          type="button"
          className={`nav-link-btn ${activeTab === "bai-hoc" && location.pathname !== "/home" ? "active" : ""}`}
          onClick={() => setActiveTab("bai-hoc")}
        >
          <span className="nav-link-icon">📖</span>
          <span className="nav-link-text">Bài học</span>
        </button>

        <button
          type="button"
          className={`nav-link-btn ${activeTab === "tu-vung" && location.pathname !== "/home" ? "active" : ""}`}
          onClick={() => setActiveTab("tu-vung")}
        >
          <span className="nav-link-icon">🎴</span>
          <span className="nav-link-text">Từ vựng</span>
        </button>

        <button
          type="button"
          className={`nav-link-btn ${activeTab === "ngu-phap" && location.pathname !== "/home" ? "active" : ""}`}
          onClick={() => setActiveTab("ngu-phap")}
        >
          <span className="nav-link-icon">📑</span>
          <span className="nav-link-text">Ngữ pháp</span>
        </button>

        <button
          type="button"
          className={`nav-link-btn ${activeTab === "luyen-de" && location.pathname !== "/home" ? "active" : ""}`}
          onClick={() => setActiveTab("luyen-de")}
        >
          <span className="nav-link-icon">📝</span>
          <span className="nav-link-text">Luyện đề</span>
        </button>

        <button
          type="button"
          className={`nav-link-btn ${activeTab === "thong-ke" && location.pathname !== "/home" ? "active" : ""}`}
          onClick={() => setActiveTab("thong-ke")}
        >
          <span className="nav-link-icon">📊</span>
          <span className="nav-link-text">Thống kê</span>
        </button>

        <button
          type="button"
          className={`nav-link-btn ${activeTab === "cai-dat" && location.pathname !== "/home" ? "active" : ""}`}
          onClick={() => setActiveTab("cai-dat")}
        >
          <span className="nav-link-icon">⚙️</span>
          <span className="nav-link-text">Cài đặt</span>
        </button>

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
              <span className="nav-link-icon">🛠️</span>
              <span className="nav-link-text">Quản trị Admin</span>
              <span className="admin-badge-pill">ADMIN</span>
            </button>
          </div>
        )}
      </nav>

      {/* Bottom Sidebar Decorative Illustration */}
      <SidebarCatDecoration />
    </aside>
  );
}
