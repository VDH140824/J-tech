import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { authKeys, useCurrentUser } from "../../hooks/useAuth";
import * as authApi from "../../api/authApi";
import type { UpdateProfileRequest } from "../../types/auth";
import "./ProfilePage.css";

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: currentUser, isLoading, isError } = useCurrentUser();

  const user = currentUser ?? storedUser;

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? user?.displayName ?? "");
    setDateOfBirth(formatDateInput(user?.dateOfBirth ?? null));
  }, [user]);

  const initial = useMemo(() => {
    const base = user?.fullName ?? user?.displayName ?? user?.email ?? "U";
    return base.charAt(0).toUpperCase();
  }, [user]);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.");
      setMessage("");
      return;
    }
    setUploadingAvatar(true);
    setError("");
    setMessage("");
    try {
      const updated = await authApi.updateAvatar(file);
      queryClient.setQueryData(authKeys.me(accessToken), updated);
      setUser(updated);
      setMessage("Cập nhật ảnh đại diện thành công.");
    } catch {
      setError("Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    setMessage("");
    setError("");

    const payload: UpdateProfileRequest = {
      displayName: fullName.trim() || null,
      fullName: fullName.trim() || null,
      dateOfBirth: dateOfBirth || null,
    };

    try {
      const updated = await authApi.updateProfile(user.id, payload);
      queryClient.setQueryData(authKeys.me(accessToken), updated);
      setUser(updated);
      setMessage("Cập nhật thông tin thành công.");
    } catch {
      setError("Không thể cập nhật thông tin. Vui lòng thử lại.");
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
          <div className="profile-avatar-wrap">
            <div className="profile-avatar profile-avatar-hero">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user?.fullName ?? user?.displayName ?? "Avatar"} className="profile-avatar-img" />
              ) : (
                initial
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="profile-avatar-input" onChange={handleAvatarChange} aria-label="Chọn ảnh đại diện" />
            <button type="button" className="profile-avatar-edit" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar || !user?.id}>
              {uploadingAvatar ? "Đang tải..." : "✎ Chỉnh sửa ảnh"}
            </button>
          </div>
          <div>
            <span className="profile-eyebrow">HỒ SƠ CỦA BẠN</span>
            <h1>{user?.fullName ?? user?.displayName ?? "Chưa có tên"}</h1>
            <p className="profile-email">{user?.email ?? "Chưa có email"}</p>
          </div>
        </section>

        <section className="profile-card profile-details-card">
          <div className="profile-card-header">
            <div>
              <span className="profile-eyebrow">TỔNG QUAN</span>
              <h2>Thông tin cá nhân</h2>
              <p>Các thông tin chính trong hành trình học tập của bạn.</p>
            </div>
          </div>

          {isLoading && <p>Đang tải dữ liệu...</p>}
          {isError && <p>Không thể tải thông tin tài khoản.</p>}

          <div className="profile-details-grid">
            <div className="profile-detail-item profile-detail-birthday">
              <span className="profile-detail-icon" aria-hidden="true">🎂</span>
              <div>
                <span>Ngày sinh</span>
                <strong>{formatDateDisplay(user?.dateOfBirth)}</strong>
              </div>
            </div>
            <div className="profile-detail-item profile-detail-coins">
              <span className="profile-detail-icon" aria-hidden="true">🪙</span>
              <div>
                <span>Xu hiện tại</span>
                <strong>{(user?.coinBalance ?? 0).toLocaleString("vi-VN")} xu</strong>
              </div>
            </div>
            <div className="profile-detail-item profile-detail-streak">
              <span className="profile-detail-icon" aria-hidden="true">🔥</span>
              <div>
                <span>Chuỗi streak hiện tại</span>
                <strong>{(user?.currentStreak ?? 0).toLocaleString("vi-VN")} ngày</strong>
              </div>
            </div>
            <div className="profile-detail-item profile-detail-longest">
              <span className="profile-detail-icon" aria-hidden="true">🏆</span>
              <div>
                <span>Chuỗi streak dài nhất</span>
                <strong>{(user?.longestStreak ?? 0).toLocaleString("vi-VN")} ngày</strong>
              </div>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-edit-heading">
              <h3>Chỉnh sửa thông tin</h3>
              <p>Cập nhật tên và ngày sinh của bạn.</p>
            </div>
            <div className="profile-edit-grid">
              <label>
                Họ và tên
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập tên hiển thị"
                />
              </label>

              <label>
                Ngày sinh
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
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
