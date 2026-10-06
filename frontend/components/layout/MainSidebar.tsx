import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import sidebarCatImg from "../../assets/sidebar-cat.png";
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
      <img
        src={sidebarCatImg}
        alt="一緒にがんばろう！"
        className="sidebar-cat-img"
      />
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
