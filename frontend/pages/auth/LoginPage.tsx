import { AuthShell, GoogleButton } from "../../components/ui/auth";

export function LoginPage() {
  const handleGoogleSignIn = () => {
    const backendUrl =
      import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <AuthShell
      title="こにちは! Chào mừng bạn đến với J-Tech"
      description="Đăng nhập bằng Google để tiếp tục luyện tập tiếng Nhật cùng J-Tech."
      footer={
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "rgba(241, 245, 249, 0.78)",
            marginTop: 4,
          }}
        >
          Kết nối an toàn với Spring Boot backend API.
        </p>
      }
    >
      <GoogleButton type="button" onClick={handleGoogleSignIn}>
        Tiếp tục với Google
      </GoogleButton>
    </AuthShell>
  );
}
