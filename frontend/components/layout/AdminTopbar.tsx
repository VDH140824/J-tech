import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useCurrentUser } from "../../hooks/useAuth";
import { UserMenu } from "./UserMenu";
import "./AdminTopbar.css";

interface AdminTopbarProps {
  title?: string;
  breadcrumb?: string;
}

export function AdminTopbar({ title, breadcrumb }: AdminTopbarProps) {
  const user = useAuthStore((s) => s.user);
  useCurrentUser();
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

        {/* Same account menu as the homepage: Admin portal, profile and logout. */}
        <UserMenu />
      </div>
    </header>
  );
}
