import { AdminRewardsPage } from "./AdminRewardsPage";
import { AdminMilestonesPage } from "./AdminMilestonesPage";
import { useEffect, useState } from "react";
import { FeedbackPage } from "../feedback/FeedbackPage";
import { useLocation } from "react-router-dom";
import { AdminDashboardTab } from "./AdminDashboardTab";
import { AdminUsersTab } from "./AdminUsersTab";
import { PendingUsersPage } from "./PendingUsersPage";
import { AdminLayout } from "../../layouts/AdminLayout";
import "./AdminPortalPage.css";

export type AdminTab = "dashboard" | "users" | "pending" | "settings" | "feedback" | "items" | "rules" | "milestones";

export function AdminPortalPage() {
  const location = useLocation();

  // In the screenshot, "Quản lý tài khoản" is the primary default view
  const path = location.pathname;
  let initialTab: AdminTab = "users";
  if (path.includes("/admin/rewards/milestones")) { initialTab = "milestones";
  } else if (path.includes("/admin/rewards/items")) { initialTab = "items";
  } else if (path.includes("/admin/rewards/rules")) { initialTab = "rules";
  } else if (path.includes("/admin/feedback")) {
    initialTab = "feedback";
  } else if (path.includes("/admin/dashboard")) {
    initialTab = "dashboard";
  } else if (path.includes("/admin/pending")) {
    initialTab = "pending";
  } else if (path.includes("/admin/settings")) {
    initialTab = "settings";
  }

  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab as AdminTab);
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
    >
      {activeTab === "items" && <AdminRewardsPage key="items" mode="items" />}
      {activeTab === "milestones" && <AdminMilestonesPage />}
      {activeTab === "rules" && <AdminRewardsPage key="rules" mode="rules" />}
      {activeTab === "feedback" && <FeedbackPage portal="admin" />}
      {activeTab === "dashboard" && <AdminDashboardTab />}
      {activeTab === "users" && (
        <AdminUsersTab onNavigateToPending={() => setActiveTab("pending")} />
      )}
      {activeTab === "pending" && <PendingUsersPage />}
      {activeTab === "settings" && (
        <div className="admin-page-container">
          <div className="admin-page-header">
            <div className="admin-header-titles">
              <h2 className="admin-main-title">Cấu hình hệ thống</h2>
              <p className="admin-main-subtitle">
                Thiết lập tham số hoạt động và bảo mật của nền tảng.
              </p>
            </div>
          </div>
          <div
            className="admin-table-card"
            style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}
          >
            <span style={{ fontSize: "2.5rem" }}>⚙️</span>
            <p style={{ marginTop: "14px", fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
              Tính năng Cấu hình hệ thống
            </p>
            <p style={{ fontSize: "0.88rem" }}>Module cấu hình hệ thống đang được phát triển.</p>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
