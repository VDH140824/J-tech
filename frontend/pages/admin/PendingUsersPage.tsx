import { useEffect, useState } from "react";
import { approvePendingUser, getPendingAdminUsers, rejectPendingUser } from "../../api/adminApi";
import type { UserResponse } from "../../types/auth";

// Helper to get initials
function getUserInitials(user: UserResponse): string {
  const name = user.fullName || user.displayName || user.email || "U";
  if (name.length <= 2) return name.toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: "#fef3c7", text: "#d97706" }, // soft amber
  { bg: "#ffe4e6", text: "#e11d48" }, // soft pink
  { bg: "#ede9fe", text: "#7c3aed" }, // soft purple
  { bg: "#cffafe", text: "#0891b2" }, // soft cyan
];

function getAvatarStyle(id: number) {
  return AVATAR_PALETTES[id % AVATAR_PALETTES.length];
}

export function PendingUsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectingUser, setRejectingUser] = useState<UserResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("Tài khoản không phải của sinh viên FPT");
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPendingAdminUsers({ size: 100 });
      setUsers(response.content ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Không thể tải danh sách tài khoản chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const changeStatus = async (userId: number, action: "approve" | "reject", reason?: string) => {
    try {
      setProcessingId(userId);
      if (action === "approve") {
        await approvePendingUser(userId);
        showNotification(`Đã phê duyệt tài khoản #${userId} thành công!`);
      } else {
        await rejectPendingUser(userId, reason!);
        showNotification(`Đã từ chối tài khoản #${userId}!`);
        setRejectingUser(null);
      }
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Không thể cập nhật tài khoản này.");
    } finally {
      setProcessingId(null);
    }
  };

  const submitReject = () => {
    if (!rejectingUser) return;
    const reason = rejectReason.trim();
    if (!reason || reason.length > 500) {
      setRejectReasonError(!reason ? "Vui lòng nhập lý do từ chối." : "Lý do không được vượt quá 500 ký tự.");
      return;
    }
    void changeStatus(rejectingUser.id, "reject", reason);
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Duyệt tài khoản người dùng</h2>
          <p className="admin-main-subtitle">
            Kiểm tra và phê duyệt các tài khoản Google mới đăng ký trước khi cấp quyền truy cập hệ thống.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn-refresh-clean"
          onClick={loadUsers}
          title="Làm mới danh sách"
        >
          <span className="btn-icon">🔄</span>
          <span>Làm mới ({users.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="admin-alert-banner success">
          <span>✅</span>
          <span>{actionSuccess}</span>
        </div>
      )}
      {error && (
        <div className="admin-alert-banner error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <div className="admin-spinner" />
            <p>Đang tải danh sách tài khoản chờ duyệt...</p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-dekiru-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>ID</th>
                  <th>TÀI KHOẢN</th>
                  <th>EMAIL</th>
                  <th>NGÀY ĐĂNG KÝ</th>
                  <th>TRẠNG THÁI</th>
                  <th style={{ textAlign: "right", width: "200px" }}>HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-table-empty">
                      🎉 Không có tài khoản nào đang chờ duyệt.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const initials = getUserInitials(user);
                    const avatarStyle = getAvatarStyle(user.id);
                    const regDate = user.createdAt
                      ? new Date(user.createdAt).toLocaleString("vi-VN")
                      : "—";
                    const isProcessing = processingId === user.id;

                    return (
                      <tr key={user.id}>
                        <td className="cell-id">#{user.id}</td>

                        <td className="cell-user-info">
                          <div
                            className="user-initials-badge"
                            style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                          >
                            {initials}
                          </div>
                          <span className="user-display-text">
                            {user.fullName || user.displayName || user.email.split("@")[0]}
                          </span>
                        </td>

                        <td className="cell-email">{user.email}</td>

                        <td className="cell-date">{regDate}</td>

                        <td className="cell-status">
                          <span className="status-badge-pill pill-pending">
                            <span className="pill-dot" />
                            CHỜ DUYỆT
                          </span>
                        </td>

                        <td className="cell-actions" style={{ textAlign: "right" }}>
                          <div className="action-buttons-wrap right-align">
                            <button
                              type="button"
                              className="btn-approve-clean"
                              disabled={isProcessing}
                              onClick={() => changeStatus(user.id, "approve")}
                              title="Chấp nhận tài khoản này"
                            >
                              {isProcessing ? "..." : "✓ Phê duyệt"}
                            </button>
                            <button
                              type="button"
                              className="btn-reject-clean"
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectingUser(user);
                                setRejectReason("Tài khoản không phải của sinh viên FPT");
                                setRejectReasonError(null);
                              }}
                              title="Từ chối tài khoản này"
                            >
                              {isProcessing ? "..." : "✕ Từ chối"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {rejectingUser && (
        <div className="admin-modal-backdrop" onClick={() => setRejectingUser(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Từ chối tài khoản #{rejectingUser.id}</h3></div>
            <div className="modal-form-body">
              <p className="modal-description">{rejectingUser.email}</p>
              <label className="modal-field-label">
                <span>Lý do từ chối *</span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectReasonError(null); }}
                  maxLength={500}
                  rows={3}
                  className="modal-input"
                  aria-invalid={!!rejectReasonError}
                />
                {rejectReasonError && <span className="modal-field-error" role="alert">{rejectReasonError}</span>}
              </label>
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" onClick={() => setRejectingUser(null)}>Hủy</button>
                <button type="button" className="btn-modal-submit" disabled={processingId === rejectingUser.id} onClick={submitReject}>
                  {processingId === rejectingUser.id ? "Đang xử lý..." : "Xác nhận từ chối"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
