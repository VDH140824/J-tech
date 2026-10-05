import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { AdminTopbar } from "../components/layout/AdminTopbar";
import "./AdminLayout.css";

interface AdminLayoutProps {
  children?: ReactNode;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  title?: string;
  breadcrumb?: string;
}

/**
 * AdminLayout serves as the standard, reusable template layout for ALL admin pages
 * now and into the future.
 */
export function AdminLayout({
  children,
  activeTab,
  onSelectTab,
  title,
  breadcrumb,
}: AdminLayoutProps) {
  return (
    <div className="admin-dekiru-layout">
      {/* Shared Admin Sidebar with Dekiru theme */}
      <AdminSidebar activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Main Right Area: Topbar + Page Content */}
      <div className="admin-dekiru-workspace">
        <AdminTopbar title={title} breadcrumb={breadcrumb} />
        <main className="admin-dekiru-page-body">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
