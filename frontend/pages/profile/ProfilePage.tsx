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

function formatDateDisplay(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

function formatDisplayValue(value?: string | null) {
  return value?.trim() ? value : "—";
}

function formatRoleLabel(role?: string | null) {
  if (!role) return "—";
  const r = role.toUpperCase();
  if (r === "ADMIN" || r === "ROLE_ADMIN") return "Quản trị viên";
  if (r === "MODERATOR") return "Kiểm duyệt viên";
  if (r === "STUDENT") return "Học viên";
  return role;
}

function formatStatusLabel(status?: string | null) {
  if (!status) return "—";
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Đang hoạt động";
  if (s === "PENDING") return "Chờ duyệt";
  if (s === "LOCKED") return "Tạm khóa";
  if (s === "REJECTED") return "Bị từ chối";
  return status;
}

function formatAvatarLabel(value?: string | null) {
  if (value?.trim()) return value.trim();
  return "Mặc định hệ thống";
}

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storedUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const { data: currentUser, isLoading, isError } = useCurrentUser();

  const user = currentUser ?? storedUser;

  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.displayName ?? "");
    setDateOfBirth(formatDateInput(user?.dateOfBirth ?? null));
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
      displayName: fullName.trim() || null,
      fullName: fullName.trim() || null,
      dateOfBirth: dateOfBirth || null,
    };

    try {
      const updated = await authApi.updateProfile(user.id, payload);
      queryClient.setQueryData(["auth", "me"], updated);
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
          <div className="profile-avatar">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName ?? "Avatar"} className="profile-avatar-img" />
            ) : (
              initial
            )}
          </div>
          <div>
            <h1>Hồ sơ người dùng</h1>
            <p>{user?.displayName ?? "Chưa có tên"}</p>
            <p>{user?.email ?? ""}</p>
            <p>Vai trò: {formatRoleLabel(user?.role)}</p>
          </div>
        </section>

        <section className="profile-card">
          <div className="profile-card-header">
            <div>
              <h2>Thông tin tài khoản</h2>
              <p>Xem và chỉnh sửa thông tin trực tiếp từ tài khoản người dùng.</p>
            </div>
            <div className="profile-avatar preview">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName ?? "Avatar"} className="profile-avatar-img" />
              ) : (
                initial
              )}
            </div>
          </div>

          {isLoading && <p>Đang tải dữ liệu...</p>}
          {isError && <p>Không thể tải thông tin tài khoản.</p>}

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-details-grid">
              <div className="profile-detail-item">
                <span>Ảnh đại diện</span>
                <strong>{formatAvatarLabel(user?.avatarUrl)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Vai trò</span>
                <strong>{formatRoleLabel(user?.role)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Trạng thái</span>
                <strong>{formatStatusLabel(user?.status)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Số dư xu</span>
                <strong>{(user?.coinBalance ?? 0).toLocaleString()} xu</strong>
              </div>
              <div className="profile-detail-item">
                <span>Ngày sinh</span>
                <strong>{formatDateDisplay(user?.dateOfBirth)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Đăng nhập gần nhất</span>
                <strong>{formatDateTime(user?.lastLogin)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Tạo lúc</span>
                <strong>{formatDateTime(user?.createdAt)}</strong>
              </div>
              <div className="profile-detail-item">
                <span>Cập nhật lúc</span>
                <strong>{formatDateTime(user?.updatedAt)}</strong>
              </div>
            </div>

            <div className="profile-edit-grid">
              <label>
                Tên hiển thị
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập tên hiển thị"
                />
              </label>

              <label>
                Email
                <input value={user?.email ?? ""} disabled />
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
