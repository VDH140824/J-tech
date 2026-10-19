import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { ModeratorSidebar } from "../components/layout/ModeratorSidebar";
import { ModeratorTopbar } from "../components/layout/ModeratorTopbar";
import "./AdminLayout.css";

interface ModeratorLayoutProps {
  children?: ReactNode;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  title?: string;
  breadcrumb?: string;
}

/**
 * ModeratorLayout serves as the standard, reusable template layout for ALL moderator pages.
 * Shares the same CSS as AdminLayout for consistent appearance.
 */
export function ModeratorLayout({
  children,
  activeTab,
  onSelectTab,
  title,
  breadcrumb,
}: ModeratorLayoutProps) {
  return (
    <div className="admin-dekiru-layout">
      {/* Shared Moderator Sidebar with Dekiru theme */}
      <ModeratorSidebar activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Main Right Area: Topbar + Page Content */}
      <div className="admin-dekiru-workspace">
        <ModeratorTopbar title={title} breadcrumb={breadcrumb} />
        <main className="admin-dekiru-page-body">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
