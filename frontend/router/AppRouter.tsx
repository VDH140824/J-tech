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

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </>
  );
}
