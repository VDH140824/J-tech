import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPendingAdminUsers } from "../../api/adminApi";
import "./AdminSidebar.css";

// Sakura logo badge matching Dekiru brand
function DekiruAdminBadgeIcon() {
  return (
    <div className="admin-brand-icon-box">
      <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
        <g transform="translate(20, 20)">
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <path
              key={i}
              transform={`rotate(${angle})`}
              d="M 0 0 C -5 -9, -7 -16, 0 -18 C 7 -16, 5 -9, 0 0 Z"
              fill="#F43F5E"
            />
          ))}
          <circle cx="0" cy="0" r="3.5" fill="#FFF5F7" />
          <circle cx="0" cy="0" r="2" fill="#FF8CA3" />
        </g>
      </svg>
    </div>
  );
}

interface AdminSidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onSelectTab }: AdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState<number>(1);

  // Fetch pending count for dynamic counter badge
  useEffect(() => {
    let isMounted = true;
    getPendingAdminUsers({ size: 100 })
      .then((res) => {
        if (isMounted && res.content) {
          setPendingCount(res.content.length);
        }
      })
      .catch(() => {
        // Fallback default
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Determine current active item from URL or prop
  const currentPath = location.pathname;
  const currentTab =
    activeTab ||
    (currentPath.includes("/admin/users")
      ? "users"
      : currentPath.includes("/admin/pending")
        ? "pending"
        : currentPath.includes("/admin/settings")
          ? "settings"
            : currentPath === "/admin" || currentPath.includes("/admin/dashboard")
              ? "dashboard"
              : "users");

  const handleNavClick = (tabKey: string, route: string) => {
    if (onSelectTab) {
      onSelectTab(tabKey);
    }
    navigate(route);
  };

  return (
    <aside className="admin-dekiru-sidebar">
      {/* Brand Header */}
      <div className="admin-sidebar-header" onClick={() => navigate("/home")}>
        <DekiruAdminBadgeIcon />
        <div className="admin-sidebar-brand-text">
          <div className="brand-name-row">
            <span className="brand-name">Dekiru</span>
            <span className="admin-pill-badge">ADMIN</span>
          </div>
          <span className="brand-sub">Hệ sinh thái tiếng Nhật</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="admin-sidebar-menu">
        <div className="admin-menu-section-label">CHỨC NĂNG QUẢN TRỊ</div>

        {/* 1. Sơ đồ & Thống kê */}
        <button
          type="button"
          className={`admin-nav-item ${currentTab === "dashboard" ? "active" : ""}`}
          onClick={() => handleNavClick("dashboard", "/admin/dashboard")}
        >
          <span className="admin-nav-icon">⏱️</span>
          <span className="admin-nav-label">Sơ đồ & Thống kê</span>
        </button>

        {/* 2. Quản lý tài khoản */}
        <button
          type="button"
          className={`admin-nav-item ${currentTab === "users" ? "active" : ""}`}
          onClick={() => handleNavClick("users", "/admin/users")}
        >
          <span className="admin-nav-icon">👥</span>
          <span className="admin-nav-label">Quản lý tài khoản</span>
        </button>

        {/* 3. Duyệt nội dung / Duyệt tài khoản */}
        <button
          type="button"
          className={`admin-nav-item ${currentTab === "pending" ? "active" : ""}`}
          onClick={() => handleNavClick("pending", "/admin/pending")}
        >
          <span className="admin-nav-icon">⏳</span>
          <span className="admin-nav-label">Duyệt tài khoản sinh viên</span>
          {pendingCount > 0 && (
            <span className="admin-pending-count-badge">{pendingCount}</span>
          )}
        </button>

        {/* 5. Cấu hình hệ thống (Placeholder for future development) */}
        <button
          type="button"
          className={`admin-nav-item ${currentTab === "settings" ? "active" : ""}`}
          onClick={() => handleNavClick("settings", "/admin/settings")}
        >
          <span className="admin-nav-icon">⚙️</span>
          <span className="admin-nav-label">Cấu hình hệ thống</span>
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
