import { AuthShell, GoogleButton } from "../../components/ui/auth";

export function LoginPage() {
  const handleGoogleSignIn = () => {
    const backendUrl =
      import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <AuthShell
      title="Chào m?ng tr? l?i ??"
      description="Ðang nh?p b?ng Google d? ti?p t?c tham gia c?ng d?ng l?ch s? Vi?t Nam trên J-Tech."
      footer={
        <p style={{ textAlign: "center", fontSize: 12, color: "rgba(100,116,139,0.8)", marginTop: 4 }}>
          ?? Connected with Spring Boot backend API.
        </p>
      }
    >
      <GoogleButton type="button" onClick={handleGoogleSignIn}>
        Continue with Google
      </GoogleButton>
    </AuthShell>
  );
}