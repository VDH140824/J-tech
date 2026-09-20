import { useNavigate } from "react-router-dom";
import type React from "react";
import { useAuthStore } from "../../store/authStore";

export function AccountRejectedPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const backToLogin = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon}>🚫</div>
        <h1 style={styles.title}>Account access unavailable</h1>
        <p style={styles.message}>Your account was not approved or is currently blocked.</p>
        <p style={styles.description}>This account cannot access the system. Please contact an administrator if you believe this is a mistake.</p>
        <button type="button" style={styles.button} onClick={backToLogin}>Back to Google sign-in</button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b0f17", color: "#e6edf3" },
  card: { width: "min(100%, 520px)", textAlign: "center", padding: "40px 32px", border: "1px solid #5a2121", borderRadius: 14, background: "#121824" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { margin: "0 0 16px", fontSize: 26 },
  message: { margin: "0 0 10px", fontSize: 18, fontWeight: 600 },
  description: { margin: "0 0 28px", color: "#8b949e", lineHeight: 1.6 },
  button: { border: 0, borderRadius: 6, padding: "11px 18px", background: "#da3633", color: "#fff", fontWeight: 600, cursor: "pointer" },
};
