import { useNavigate } from "react-router-dom";
import type React from "react";

export function PendingApprovalPage() {
  const navigate = useNavigate();

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon}>⏳</div>
        <h1 style={styles.title}>Tài khoản đang chờ xét duyệt</h1>
        <p style={styles.message}>Tài khoản của bạn đang chờ quản trị viên phê duyệt.</p>
        <p style={styles.description}>Vui lòng chờ ban quản trị kiểm tra và cấp quyền truy cập, sau đó đăng nhập lại bằng Google.</p>
        <button type="button" style={styles.button} onClick={() => navigate("/login", { replace: true })}>
          Quay lại đăng nhập Google
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b0f17", color: "#e6edf3" },
  card: { width: "min(100%, 520px)", textAlign: "center", padding: "40px 32px", border: "1px solid #212d45", borderRadius: 14, background: "#121824" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { margin: "0 0 16px", fontSize: 26 },
  message: { margin: "0 0 10px", fontSize: 18, fontWeight: 600 },
  description: { margin: "0 0 28px", color: "#8b949e", lineHeight: 1.6 },
  button: { border: 0, borderRadius: 6, padding: "11px 18px", background: "#238636", color: "#fff", fontWeight: 600, cursor: "pointer" },
};
