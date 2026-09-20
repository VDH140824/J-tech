import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { checkIsAdmin } from "../../utils/auth";
import { useCurrentUser } from "../../hooks/useAuth";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { isLoading } = useCurrentUser();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#0d1117",
        color: "#e6edf3"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚙️</div>
          <p style={{ fontSize: "1.1rem", color: "#8b949e" }}>Đang xác thực quyền Admin...</p>
        </div>
      </div>
    );
  }

  const status = user?.status?.toUpperCase();
  if (status === "PENDING") {
    return <Navigate to="/pending-approval" replace />;
  }
  if (status === "INACTIVE" || status === "LOCKED" || status === "BANNED") {
    return <Navigate to="/account-rejected" replace />;
  }

  if (!isAuthenticated || !checkIsAdmin(user) || status !== "ACTIVE") {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
