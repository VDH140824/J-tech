import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wraps private routes. Redirects unauthenticated users to /login,
 * preserving the original URL so we can redirect back after login.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Zustand persist can hydrate asynchronously, so use localStorage as a
  // fallback to avoid incorrectly sending logged-in users back to /login.
  const hasStoredToken = !!localStorage.getItem("accessToken");

  if (!isAuthenticated && !hasStoredToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const status = user?.status?.toUpperCase();
  if (status === "PENDING") {
    return <Navigate to="/pending-approval" replace />;
  }
  if (status === "INACTIVE" || status === "LOCKED" || status === "BANNED") {
    return <Navigate to="/account-rejected" replace />;
  }

  return <>{children}</>;
}
