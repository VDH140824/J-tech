import { useNavigate } from "react-router-dom";
import type React from "react";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../services/api";

export function AccountRejectedPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const storedUser = useAuthStore((state) => state.user);
  const [accountStatus, setAccountStatus] = useState<{ status?: string; statusReason?: string | null }>({});

  useEffect(() => {
    let active = true;
    apiClient.get<{ status: string; statusReason?: string }>("/auth/account-status")
      .then(({ data }) => { if (active && data) setAccountStatus(data); })
      .catch(() => { /* A saved user can still provide the status when no OAuth session exists. */ });
    return () => { active = false; };
  }, []);

  const status = accountStatus.status || storedUser?.status;
  const reason = accountStatus.status
    ? accountStatus.statusReason
    : storedUser?.statusReason;
  const isLocked = status === "LOCKED";
  const isRejected = status === "REJECTED";

  const backToLogin = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon}>🚫</div>
        <h1 style={styles.title}>{isLocked ? "Tài khoản đã bị khóa" : isRejected ? "Yêu cầu kích hoạt đã bị từ chối" : "Không thể truy cập tài khoản"}</h1>
        <p style={styles.message}>{isLocked ? "Tài khoản của bạn đang bị khóa." : isRejected ? "Tài khoản của bạn không được phê duyệt." : "Tài khoản của bạn hiện không thể truy cập."}</p>
        {reason && <p style={styles.reason}><strong>Lý do:</strong> {reason}</p>}
        <p style={styles.description}>Tài khoản này hiện không thể truy cập hệ thống. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là sự nhầm lẫn.</p>
        <button type="button" style={styles.button} onClick={backToLogin}>Quay lại đăng nhập Google</button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "#0b0f17",
    color: "#e6edf3",
  },
  card: {
    width: "min(100%, 520px)",
    textAlign: "center",
    padding: "40px 32px",
    border: "1px solid #5a2121",
    borderRadius: 14,
    background: "#121824",
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { margin: "0 0 16px", fontSize: 26 },
  message: { margin: "0 0 10px", fontSize: 18, fontWeight: 600 },
  description: { margin: "0 0 28px", color: "#8b949e", lineHeight: 1.6 },
  reason: { margin: "0 0 20px", padding: "12px 16px", borderRadius: 8, background: "#2a1b20", textAlign: "left", overflowWrap: "anywhere" },
  button: { border: 0, borderRadius: 6, padding: "11px 18px", background: "#da3633", color: "#fff", fontWeight: 600, cursor: "pointer" },
};
