import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { useCurrentUser } from "../../hooks/useAuth";
import * as authApi from "../../api/authApi";
import type { UpdateProfileRequest } from "../../types/auth";
import "./ProfilePage.css";

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
}

function formatDisplayValue(value?: string | null) {
  return value?.trim() ? value : "—";
}

function formatAvatarLabel(value?: string | null) {
  if (value?.trim()) return value.trim();
  return "—";
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data: currentUser, isLoading, isError } = useCurrentUser();

  const user = currentUser ?? storedUser;

  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [country, setCountry] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [bio, setBio] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.displayName ?? "");
    setBirthday(formatDateInput(user?.birthday ?? null));
    setCountry(user?.country ?? "");
    setNativeLanguage(user?.nativeLanguage ?? "");
    setBio(user?.bio ?? "");
  }, [user]);

  const initial = useMemo(() => {
    const base = user?.displayName ?? user?.email ?? "U";
    return base.charAt(0).toUpperCase();
  }, [user]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setMessage("");
    setError("");

    const payload: UpdateProfileRequest = {
      fullName: fullName.trim() || null,
      birthday: birthday || null,
      country: country.trim() || null,
      nativeLanguage: nativeLanguage.trim() || null,
      bio: bio.trim() || null,
    };

    try {
      const updated = await authApi.updateProfile(user.id, payload);
      queryClient.setQueryData(["auth", "me"], updated);
      setUser(updated);
      setMessage("Cập nhật profile thành công.");
    } catch {
      setError("Không thể cập nhật profile. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button
          type="button"
          className="profile-back-btn"
          onClick={() => navigate("/home")}
        >
          ← Quay lại trang chủ
        </button>
      </header>

      <main className="profile-shell">
        <section className="profile-card profile-summary">
          <div className="profile-avatar">{initial}</div>
          <div>
            <h1>Hồ sơ cá nhân</h1>
            <p>{user?.displayName ?? "Chưa có tên"}</p>
            <p>{user?.email ?? ""}</p>
            <p>Vai trò: {user?.role ?? "User"}</p>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-header">
            <div>
              <h2>Thông tin tài khoản</h2>
              <p>Xem và chỉnh sửa thông tin có sẵn của tài khoản đang đăng nhập.</p>
            </div>
            <div className="profile-avatar preview">{initial}</div>
          </div>

          {isLoading && <p>Đang tải dữ liệu...</p>}
          {isError && <p>Không thể tải thông tin tài khoản.</p>}

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span>Avatar URL</span>
                <strong>{formatAvatarLabel(user?.avatarUrl)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Vai trò</span>
                <strong>{formatDisplayValue(user?.role)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Trạng thái</span>
                <strong>{formatDisplayValue(user?.status)}</strong>
              </div>

              <div className="profile-detail-item">
                <span>Đăng nhập gần nhất</span>
                <strong>{formatDateTime(user?.lastLogin)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Tạo lúc</span>
                <strong>{formatDateTime(user?.createdAt)}</strong>
              </div>
            </div>

            <div className="profile-edit-grid">
              <label>
                Tên hiển thị
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>

              <label>
                Email
                <input value={user?.email ?? ""} disabled />
              </label>

              <label>
                Ngày sinh
                <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
              </label>

              <label>
                Quốc gia
                <input value={country} onChange={(e) => setCountry(e.target.value)} />
              </label>

              <label>
                Ngôn ngữ mẹ đẻ
                <input value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)} />
              </label>

              <label className="profile-edit-wide">
                Giới thiệu
                <textarea rows={5} value={bio} onChange={(e) => setBio(e.target.value)} />
              </label>
            </div>

            <div className="profile-actions">
              <button type="submit" disabled={saving || !user?.id}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>

            {message && <p className="profile-message success">{message}</p>}
            {error && <p className="profile-message error">{error}</p>}
          </form>
        </section>
      </main>
    </div>
  );
}
