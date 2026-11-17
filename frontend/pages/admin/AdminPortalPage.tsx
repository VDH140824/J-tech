import { AdminRewardsPage } from "./AdminRewardsPage";
import { AdminMilestonesPage } from "./AdminMilestonesPage";
import { AdminSystemLogsPage } from "./AdminSystemLogsPage";
import { AdminSystemSettingsPage } from "./AdminSystemSettingsPage";
import { useEffect, useState } from "react";
import { FeedbackPage } from "../feedback/FeedbackPage";
import { useLocation } from "react-router-dom";
import { AdminDashboardTab } from "./AdminDashboardTab";
import { AdminUsersTab } from "./AdminUsersTab";
import { PendingUsersPage } from "./PendingUsersPage";
import { AdminLayout } from "../../layouts/AdminLayout";
import "./AdminPortalPage.css";

export type AdminTab = "dashboard" | "users" | "pending" | "settings" | "feedback" | "items" | "rules" | "milestones" | "system-logs";

export function AdminPortalPage() {
  const location = useLocation();

  // In the screenshot, "Quản lý tài khoản" is the primary default view
  const path = location.pathname;
  let initialTab: AdminTab = "users";
  if (path.startsWith("/admin/system-logs")) { initialTab = "system-logs";
  } else if (path.includes("/admin/rewards/milestones")) { initialTab = "milestones";
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
      {activeTab === "system-logs" && <AdminSystemLogsPage />}
      {activeTab === "rules" && <AdminRewardsPage key="rules" mode="rules" />}
      {activeTab === "feedback" && <FeedbackPage portal="admin" />}
      {activeTab === "dashboard" && <AdminDashboardTab />}
      {activeTab === "users" && (
        <AdminUsersTab onNavigateToPending={() => setActiveTab("pending")} />
      )}
      {activeTab === "pending" && <PendingUsersPage />}
      {activeTab === "settings" && <AdminSystemSettingsPage />}
    </AdminLayout>
  );
}
