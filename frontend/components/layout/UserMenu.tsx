import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import { UserAvatar } from "./UserAvatar";
import "./UserMenu.css";

export function UserMenu() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { mutate: logout } = useLogout();

  const displayName = user?.displayName ?? user?.email ?? "";
  const userName = isAuthenticated ? (displayName ? displayName : "Học viên") : "Khách";
  const normalizedRole = user?.role?.trim().toUpperCase();
  const normalizedRoleId = String(user?.roleId ?? "");
  const isAdmin =
    normalizedRoleId === "1" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "ROLE_ADMIN";

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="user-profile-wrapper" ref={profileRef}>
      <button
        type="button"
        className="user-profile-trigger"
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        aria-expanded={isProfileOpen}
        aria-haspopup="true"
      >
        <UserAvatar user={user} />
        <span className="user-display-name">{userName}</span>
        <span className={`dropdown-arrow ${isProfileOpen ? "open" : ""}`}>▾</span>
      </button>

      {isProfileOpen && (
        <div className="profile-dropdown-card">
          <div className="dropdown-user-header">
            <div className="dropdown-user-name">{displayName || "Học viên"}</div>
            <div className="dropdown-user-email">{user?.email || "user@jtech.edu.vn"}</div>
            {isAdmin && <span className="admin-role-badge">QUẢN TRỊ HỆ THỐNG</span>}
          </div>

          <div className="dropdown-menu-list">
            {isAdmin && (
              <button
                type="button"
                className="dropdown-item admin-item"
                onClick={() => {
                  setIsProfileOpen(false);
                  navigate("/admin");
                }}
              >
                🛠️ Quản trị Admin
              </button>
            )}

            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                setIsProfileOpen(false);
                navigate("/profile");
              }}
            >
              👤 Hồ sơ cá nhân
            </button>

            <button
              type="button"
              className="dropdown-item logout-item"
              onClick={() => {
                setIsProfileOpen(false);
                logout();
              }}
            >
              🚪 Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
