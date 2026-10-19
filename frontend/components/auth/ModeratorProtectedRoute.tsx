import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { checkIsModerator } from "../../utils/auth";
import { useCurrentUser } from "../../hooks/useAuth";

interface ModeratorProtectedRouteProps {
  children: ReactNode;
}

export function ModeratorProtectedRoute({ children }: ModeratorProtectedRouteProps) {
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
        backgroundColor: "#f8fafc",
        color: "#1e293b"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📋</div>
          <p style={{ fontSize: "1.1rem", color: "#64748b" }}>Đang xác thực quyền Moderator...</p>
        </div>
      </div>
    );
  }

  const status = user?.status?.toUpperCase();
  if (status === "PENDING") {
    return <Navigate to="/pending-approval" replace />;
  }
  if (status === "REJECTED" || status === "LOCKED") {
    return <Navigate to="/account-rejected" replace />;
  }

  if (!isAuthenticated || !checkIsModerator(user) || status !== "ACTIVE") {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
