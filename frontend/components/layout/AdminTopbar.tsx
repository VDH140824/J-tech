import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import "./AdminTopbar.css";

interface AdminTopbarProps {
  title?: string;
  breadcrumb?: string;
}

export function AdminTopbar({ title, breadcrumb }: AdminTopbarProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Compute dynamic breadcrumb based on current route if not explicitly provided
  const path = location.pathname;
  let defaultTitle = "Quản trị hệ thống";
  let defaultBreadcrumb = "Trang chủ / Quản lý người dùng & phân quyền";

  if (path.includes("/admin/dashboard")) {
    defaultBreadcrumb = "Trang chủ / Sơ đồ & Thống kê sinh thái J-Tech";
  } else if (path.includes("/admin/pending")) {
    defaultBreadcrumb = "Trang chủ / Duyệt nội dung & phê duyệt tài khoản";
  } else if (path.includes("/admin/settings")) {
    defaultBreadcrumb = "Trang chủ / Cấu hình hệ thống";
  }

  const resolvedTitle = title || defaultTitle;
  const resolvedBreadcrumb = breadcrumb || defaultBreadcrumb;

  const displayName = user?.displayName || user?.email?.split("@")[0] || "daika";
  const avatarLetter = (displayName.charAt(0) || "D").toUpperCase();

  return (
    <header className="admin-dekiru-topbar">
      {/* Left side: Accent bar + Title + Breadcrumbs */}
      <div className="admin-topbar-left">
        <span className="admin-topbar-accent-bar" />
        <div className="admin-topbar-heading-group">
          <h1 className="admin-topbar-title">{resolvedTitle}</h1>
          <span className="admin-topbar-breadcrumb">{resolvedBreadcrumb}</span>
        </div>
      </div>

      {/* Right side: Notification + Admin Profile */}
      <div className="admin-topbar-right">
        {/* Notification Bell */}
        <button
          type="button"
          className="admin-topbar-notif-btn"
          title="Thông báo hệ thống"
        >
          <span className="topbar-bell-icon">🔔</span>
          <span className="topbar-notif-dot" />
        </button>

        <div className="admin-topbar-divider" />

        {/* Admin Profile Info */}
        <div className="admin-profile-box">
          <div className="admin-profile-text">
            <span className="admin-profile-name">{displayName}</span>
            <span className="admin-profile-role-tag">QUẢN TRỊ VIÊN</span>
          </div>
          <div className="admin-profile-avatar-circle">
            {avatarLetter}
          </div>
        </div>
      </div>
    </header>
  );
}
