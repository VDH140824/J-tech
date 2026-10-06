import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { exchangeOAuth2Code } from "../../api/authApi";

export function OAuth2RedirectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const exchangeAttempted = useRef(false);

  useEffect(() => {
    if (exchangeAttempted.current) return;
    exchangeAttempted.current = true;

    const error = searchParams.get("error");
    if (error) {
      clearAuth();
      alert("Đăng nhập bằng Google không thành công: " + error);
      navigate("/login", { replace: true });
      return;
    }

    const code = searchParams.get("code") || undefined;

    exchangeOAuth2Code(code)
      .then((user) => {
        if (!user || !user.accessToken) {
          throw new Error("Missing access token in exchange response");
        }

        setAuth(user, user.accessToken);

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
        console.error("Failed to complete Google authentication exchange", err);
        clearAuth();
        navigate("/login?error=oauth2_failed", { replace: true });
      });
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
        Đang xử lý đăng nhập Google, vui lòng chờ trong giây lát...
      </p>
    </div>
  );
}
