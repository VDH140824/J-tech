import { useCurrentUser } from "../../hooks/useAuth";
import { UserMenu } from "./UserMenu";
import "./AdminTopbar.css";

interface ModeratorTopbarProps {
  title?: string;
  breadcrumb?: string;
}

export function ModeratorTopbar(_props: ModeratorTopbarProps) {
  useCurrentUser();

  return (
    <header className="admin-dekiru-topbar">
      <div className="admin-topbar-right moderator-topbar-right">
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
