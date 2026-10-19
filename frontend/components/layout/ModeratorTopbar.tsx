import { useAuthStore } from "../../store/authStore";
import { useCurrentUser } from "../../hooks/useAuth";
import { UserMenu } from "./UserMenu";
import "./AdminTopbar.css";

interface ModeratorTopbarProps {
  title?: string;
  breadcrumb?: string;
}

export function ModeratorTopbar({ title, breadcrumb }: ModeratorTopbarProps) {
  useCurrentUser();

  const resolvedTitle = title || "Quản trị nội dung";
  const resolvedBreadcrumb = breadcrumb || "Trang chủ / Quản trị nội dung";

  return (
    <header className="admin-dekiru-topbar">
      {/* Left side: Accent bar + Title + Breadcrumbs */}
      <div className="admin-topbar-left">
        <span className="admin-topbar-accent-bar" style={{ backgroundColor: "#0d9488" }} />
        <div className="admin-topbar-heading-group">
          <h1 className="admin-topbar-title">{resolvedTitle}</h1>
          <span className="admin-topbar-breadcrumb">{resolvedBreadcrumb}</span>
        </div>
      </div>

      {/* Right side: Notification + Profile */}
      <div className="admin-topbar-right">
        <button
          type="button"
          className="admin-topbar-notif-btn"
          title="Thông báo"
        >
          <span className="topbar-bell-icon">🔔</span>
          <span className="topbar-notif-dot" />
        </button>

        <div className="admin-topbar-divider" />

        <UserMenu />
      </div>
    </header>
  );
}
