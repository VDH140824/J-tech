import { Outlet } from "react-router-dom";
import { MainSidebar } from "../components/layout/MainSidebar";
import { MainTopbar } from "../components/layout/MainTopbar";
import { useCurrentUser } from "../hooks/useAuth";
import "./MainLayout.css";

export function MainLayout() {
  // Keep current user info hydrated for all authenticated pages under MainLayout
  useCurrentUser();

  return (
    <div className="dekiru-app-container">
      <MainSidebar />
      <div className="dekiru-main-area">
        <MainTopbar />
        <main className="main-layout-page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
