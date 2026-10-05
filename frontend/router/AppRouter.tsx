import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { LandingPage } from "../pages/landing/LandingPage";
import { OAuth2RedirectPage } from "../pages/auth/OAuth2RedirectPage";
import { PendingApprovalPage } from "../pages/auth/PendingApprovalPage";
import { AccountRejectedPage } from "../pages/auth/AccountRejectedPage";
import { HomePage } from "../pages/home/HomePage";
import { BackgroundMusic } from "../components/ui/BackgroundMusic";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "../components/auth/AdminProtectedRoute";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { AdminPortalPage } from "../pages/admin/AdminPortalPage";
import { MainLayout } from "../layouts/MainLayout";

export function AppRouter() {
  return (
    <>
      <BackgroundMusic />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/account-rejected" element={<AccountRejectedPage />} />

        {/* Authenticated main application routes sharing MainLayout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Admin routes (Admin has its own dedicated portal layout) */}
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminPortalPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminProtectedRoute>
              <AdminPortalPage />
            </AdminProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
