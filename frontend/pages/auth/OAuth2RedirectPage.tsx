import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getCurrentUser } from "../../api/authApi";

export function OAuth2RedirectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refreshToken");
    const error = searchParams.get("error");

    if (token) {
      // The profile request needs the token first, but do not expose a temporary
      // user with id 0: Chat requires the canonical database user ID.
      localStorage.setItem("accessToken", token);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      useAuthStore.setState({ accessToken: token, refreshToken, isAuthenticated: true });

      getCurrentUser()
        .then((user) => {
          setAuth(user, token, refreshToken ?? undefined);
          const status = user.status?.toUpperCase();
          const role = user.role?.toUpperCase();
          if (status === "PENDING") {
            navigate("/pending-approval", { replace: true });
          } else if (status === "INACTIVE" || status === "LOCKED" || status === "BANNED") {
            navigate("/account-rejected", { replace: true });
          } else if (role === "ADMIN" || role === "ROLE_ADMIN" || user.roleId === 1) {
            navigate("/admin", { replace: true });
          } else {
            navigate("/home", { replace: true });
          }
        })
        .catch((err) => {
          console.error("Failed to load Google user profile", err);
          clearAuth();
          navigate("/login?error=oauth2_profile_failed", { replace: true });
        });
    } else if (error) {
      clearAuth();
      alert("Google Sign-In failed: " + error);
      navigate("/login", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate, setAuth, clearAuth]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: "#fff",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 40 }}>🔄</div>
      <p style={{ fontSize: 16, color: "#94a3b8" }}>
        Processing Google login, please wait...
      </p>
    </div>
  );
}
