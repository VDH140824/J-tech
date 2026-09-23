import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { AdminDashboardTab } from "./AdminDashboardTab";
import { AdminUsersTab } from "./AdminUsersTab";
import { PendingUsersPage } from "./PendingUsersPage";
import "./AdminPortalPage.css";

export type AdminTab = "dashboard" | "users" | "pending";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="admin-layout">
      {/* Left Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand" onClick={() => navigate("/home")}>
          <span className="brand-logo-icon">🇻🇳</span>
          <div className="brand-logo-info">
            <span className="brand-title">J-Tech ADMIN</span>
            <span className="brand-badge">Quản Trị Hệ Thống</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="nav-section-title">CHỨC NĂNG QUẢN TRỊ</div>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Sơ đồ & Thống kê</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Quản lý tài khoản</span>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            <span className="nav-icon">⏳</span>
            <span className="nav-label">Pending approvals</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" onClick={() => navigate("/home")} className="btn-back-home">
            ⬅️ Quay về Trang chủ
          </button>
        </div>
      </aside>

      {/* Main Right Workspace */}
      <div className="admin-workspace">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div className="topbar-left">
            <span className="current-tab-indicator">
              {activeTab === "dashboard" && "📊 Sơ đồ dữ liệu & Thống kê sinh thái J-Tech"}
              {activeTab === "users" && "👤 Quản lý người dùng, phân quyền & trạng thái tài khoản"}
              {activeTab === "pending" && "⏳ Pending account approvals"}
            </span>
          </div>

          <div className="topbar-right">
            <div className="admin-user-profile">
              <div className="admin-avatar">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="admin-info">
                <span className="admin-name">{user?.displayName || user?.email || "Admin"}</span>
                <span className="admin-role-tag">ROLE_ADMIN</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="admin-main-body">
          {activeTab === "dashboard" && <AdminDashboardTab />}
          {activeTab === "users" && <AdminUsersTab />}
          {activeTab === "pending" && <PendingUsersPage />}
        </main>
      </div>
    </div>
  );
}
