import { useEffect, useState } from "react";
import {
  changeAdminUserRole,
  deleteAdminUser,
  getAdminUsers,
  preCreateAdminUser,
  updateAdminUserStatus,
} from "../../api/adminApi";
import type { UserResponse } from "../../types/auth";
import type { AdminUserStatusRequest } from "../../types/admin";

type UserStatus = AdminUserStatusRequest["status"];

const STATUS_OPTIONS: UserStatus[] = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "LOCKED",
  "BANNED",
];

const STATUS_NAME_MAP: Record<UserStatus, string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Chờ duyệt",
  INACTIVE: "Chưa kích hoạt",
  LOCKED: "Tạm khóa",
  BANNED: "Bị cấm",
};

function getRoleLabel(role?: string | null): string {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN" || r === "ROLE_ADMIN") return "QUẢN TRỊ VIÊN";
  if (r === "MODERATOR") return "KIỂM DUYỆT VIÊN";
  if (r === "STUDENT") return "HỌC VIÊN";
  return role || "HỌC VIÊN";
}

function getStatusLabel(status?: string | null): string {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return "HOẠT ĐỘNG";
  if (s === "PENDING") return "CHỜ DUYỆT";
  if (s === "INACTIVE") return "CHƯA KÍCH HOẠT";
  if (s === "LOCKED") return "TẠM KHÓA";
  if (s === "BANNED") return "BỊ CẤM";
  return status || "CHỜ DUYỆT";
}

// Helper to get initials (e.g. "qp", "うず", "DK")
function getUserInitials(user: UserResponse): string {
  const name = user.displayName || user.email || "U";
  if (name.length <= 2) return name.toUpperCase();
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Generate pastel background and text color based on name/id
const AVATAR_PALETTES = [
  { bg: "#ede9fe", text: "#7c3aed" }, // soft purple
  { bg: "#ffe4e6", text: "#e11d48" }, // soft pink
  { bg: "#cffafe", text: "#0891b2" }, // soft cyan
  { bg: "#dcfce7", text: "#16a34a" }, // soft green
  { bg: "#fef3c7", text: "#d97706" }, // soft amber
  { bg: "#e0e7ff", text: "#4338ca" }, // soft indigo
];

function getAvatarStyle(id: number) {
  return AVATAR_PALETTES[id % AVATAR_PALETTES.length];
}

function formatLastLogin(dateStr?: string | null) {
  if (!dateStr) return { time: "—", date: "Chưa đăng nhập" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { time: "—", date: "—" };
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return { time, date };
}

interface AdminUsersTabProps {
  onNavigateToPending?: () => void;
}

export function AdminUsersTab({ onNavigateToPending }: AdminUsersTabProps) {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [roleIdFilter, setRoleIdFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showPreCreate, setShowPreCreate] = useState(false);
  const [preCreateEmail, setPreCreateEmail] = useState("");
  const [preCreateRole, setPreCreateRole] = useState<"STUDENT" | "MODERATOR" | "ADMIN">("MODERATOR");
  const [preCreateLoading, setPreCreateLoading] = useState(false);

  // Edit User modal state
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [editRole, setEditRole] = useState<"STUDENT" | "MODERATOR" | "ADMIN">("STUDENT");
  const [editStatus, setEditStatus] = useState<UserStatus>("ACTIVE");
  const [editSaving, setEditSaving] = useState(false);

  // Delete User state
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminUsers({
        search: search.trim() || undefined,
        roleId: roleIdFilter !== "ALL" ? Number(roleIdFilter) : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page,
        size: 10,
      });
      setUsers(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tải danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleIdFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleResetFilter = () => {
    setSearch("");
    setRoleIdFilter("ALL");
    setStatusFilter("ALL");
    setPage(0);
  };

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handlePreCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preCreateEmail.trim()) return;
    try {
      setPreCreateLoading(true);
      await preCreateAdminUser({ email: preCreateEmail.trim(), role: preCreateRole });
      showNotification(`Đã tạo tài khoản ${preCreateEmail.trim()} với quyền ${preCreateRole}!`);
      setShowPreCreate(false);
      setPreCreateEmail("");
      setPreCreateRole("MODERATOR");
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể tạo tài khoản.");
    } finally {
      setPreCreateLoading(false);
    }
  };

  const openEditModal = (user: UserResponse) => {
    setEditingUser(user);
    const resolvedRole = user.role === "ADMIN" ? "ADMIN" : user.role === "MODERATOR" ? "MODERATOR" : "STUDENT";
    setEditRole(resolvedRole);
    setEditStatus((user.status as UserStatus) || "ACTIVE");
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      setEditSaving(true);
      const id = editingUser.id;
      if (editingUser.role !== editRole) {
        await changeAdminUserRole(id, editRole);
      }
      if (editingUser.status !== editStatus) {
        await updateAdminUserStatus(id, { status: editStatus });
      }
      showNotification(`Đã cập nhật thông tin tài khoản #${id}!`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể cập nhật tài khoản.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      setDeleteLoading(true);
      await deleteAdminUser(deletingUser.id);
      showNotification("Đã xóa tài khoản thành công!");
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể xóa tài khoản.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick stats calculation
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const pendingCount = users.filter((u) => u.status === "PENDING").length;
  const lockedCount = users.filter((u) => u.status === "LOCKED" || u.status === "BANNED").length;

  return (
    <div className="admin-page-container">
      {/* 1. Header Section */}
      <div className="admin-page-header">
        <div className="admin-header-titles">
          <h2 className="admin-main-title">Quản lý tài khoản</h2>
          <p className="admin-main-subtitle">
            Admin kiểm soát danh sách người dùng, cấp quyền và phân bổ trạng thái hệ thống.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn-create-user"
          onClick={() => setShowPreCreate(true)}
        >
          <span className="btn-icon">⊕</span>
          <span>Thêm người dùng mới</span>
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

      {/* 2. Filter & Search Bar Card */}
      <div className="admin-filter-card">
        <form className="admin-filter-form" onSubmit={handleSearchSubmit}>
          {/* Search Box */}
          <div className="admin-search-wrapper">
            <span className="search-mag-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm theo email, tên hiển thị hoặc ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="admin-filter-input"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleIdFilter}
            onChange={(e) => {
              setRoleIdFilter(e.target.value);
              setPage(0);
            }}
            className="admin-filter-select"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="1">Quản trị viên (Admin)</option>
            <option value="2">Học viên (Student)</option>
            <option value="3">Kiểm duyệt viên (Moderator)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="admin-filter-select"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_NAME_MAP[status]}
              </option>
            ))}
          </select>

          {/* Filter Action Buttons */}
          <button type="submit" className="admin-btn-filter">
            <span className="btn-icon">🌪️</span>
            <span>Lọc dữ liệu</span>
          </button>

          <button
            type="button"
            className="admin-btn-reset"
            onClick={handleResetFilter}
          >
            <span className="btn-icon">🔄</span>
            <span>Đặt lại</span>
          </button>
        </form>

        {/* Quick Stats Pill Row */}
        <div className="admin-quick-stats-row">
          <span className="quick-stats-label">Thống kê nhanh:</span>
          <span className="stat-pill pill-total">Tổng: {totalElements || users.length}</span>
          <span className="stat-pill pill-active">Đang hoạt động: {activeCount}</span>
          <span
            className="stat-pill pill-pending clickable"
            onClick={() => onNavigateToPending?.()}
            title="Xem danh sách tài khoản chờ duyệt"
          >
            Chờ kích hoạt: {pendingCount}
          </span>
          <span className="stat-pill pill-locked">Bị khóa: {lockedCount}</span>
        </div>
      </div>

      {/* 3. Data Table Card */}
      <div className="admin-table-card">
        {loading ? (
          <div className="admin-table-loading">
            <div className="admin-spinner" />
            <p>Đang tải dữ liệu danh sách người dùng...</p>
          </div>
        ) : (
          <div className="admin-table-responsive">
            <table className="admin-dekiru-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>ID</th>
                  <th>TÊN HIỂN THỊ</th>
                  <th>EMAIL</th>
                  <th>VAI TRÒ</th>
                  <th>TRẠNG THÁI</th>
                  <th>LẦN ĐĂNG NHẬP CUỐI</th>
                  <th style={{ textAlign: "right", width: "130px" }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-table-empty">
                      Không tìm thấy tài khoản người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const initials = getUserInitials(user);
                    const avatarStyle = getAvatarStyle(user.id);
                    const lastLoginInfo = formatLastLogin(user.lastLogin);
                    const isMod = user.role === "MODERATOR";
                    const isAdmin = user.role === "ADMIN";
                    const isActive = user.status === "ACTIVE";
                    const isPending = user.status === "PENDING";

                    return (
                      <tr key={user.id}>
                        {/* ID */}
                        <td className="cell-id">#{user.id}</td>

                        {/* Name + Initials Badge */}
                        <td className="cell-user-info">
                          <div
                            className="user-initials-badge"
                            style={{ backgroundColor: avatarStyle.bg, color: avatarStyle.text }}
                          >
                            {initials}
                          </div>
                          <span className="user-display-text">
                            {user.displayName || user.email.split("@")[0]}
                          </span>
                        </td>

                        {/* Email */}
                        <td className="cell-email">{user.email}</td>

                        {/* Role Pill */}
                        <td className="cell-role">
                          <span
                            className={`role-pill ${isAdmin ? "pill-admin" : isMod ? "pill-mod" : "pill-student"}`}
                          >
                            <span className="pill-dot" />
                            {getRoleLabel(user.role)}
                          </span>
                        </td>

                        {/* Status Pill */}
                        <td className="cell-status">
                          <span
                            className={`status-badge-pill ${isActive ? "pill-active" : isPending ? "pill-pending" : "pill-locked"}`}
                          >
                            <span className="pill-dot" />
                            {getStatusLabel(user.status)}
                          </span>
                        </td>

                        {/* Last Login (Time & Date) */}
                        <td className="cell-last-login">
                          <div className="login-time-text">{lastLoginInfo.time}</div>
                          <div className="login-date-text">{lastLoginInfo.date}</div>
                        </td>

                        {/* Actions: Edit & Delete */}
                        <td className="cell-actions">
                          <div className="action-buttons-wrap">
                            <button
                              type="button"
                              className="btn-icon-action btn-edit-user"
                              title="Chỉnh sửa quyền & trạng thái"
                              onClick={() => openEditModal(user)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action btn-delete-user"
                              title="Xóa tài khoản"
                              onClick={() => setDeletingUser(user)}
                            >
                              <span>🗑️</span>
                              <span className="delete-text">Xóa</span>
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="admin-pagination-footer">
            <span className="pagination-info">
              Hiển thị trang <strong>{page + 1}</strong> / <strong>{totalPages}</strong> ({totalElements} tài khoản)
            </span>
            <div className="pagination-buttons">
              <button
                type="button"
                className="btn-page"
                disabled={page <= 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Trang trước
              </button>
              <button
                type="button"
                className="btn-page"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal: Thêm người dùng mới */}
      {showPreCreate && (
        <div className="admin-modal-backdrop" onClick={() => setShowPreCreate(false)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm người dùng mới</h3>
              <button type="button" className="btn-modal-close" onClick={() => setShowPreCreate(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handlePreCreate} className="modal-form-body">
              <p className="modal-description">
                Đăng ký trước tài khoản Google để tự động phân quyền ngay khi người dùng đăng nhập lần đầu.
              </p>
              <label className="modal-field-label">
                <span>Google Email *</span>
                <input
                  type="email"
                  required
                  placeholder="vi_du@fpt.edu.vn"
                  value={preCreateEmail}
                  onChange={(e) => setPreCreateEmail(e.target.value)}
                  className="modal-input"
                />
              </label>

              <label className="modal-field-label">
                <span>Phân quyền ban đầu *</span>
                <select
                  value={preCreateRole}
                  onChange={(e) => setPreCreateRole(e.target.value as any)}
                  className="modal-select"
                >
                  <option value="STUDENT">Học viên (STUDENT)</option>
                  <option value="MODERATOR">Kiểm duyệt viên (MODERATOR)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </label>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowPreCreate(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={preCreateLoading}
                  className="btn-modal-submit"
                >
                  {preCreateLoading ? "Đang tạo..." : "Xác nhận tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Chỉnh sửa người dùng */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chỉnh sửa tài khoản #{editingUser.id}</h3>
              <button type="button" className="btn-modal-close" onClick={() => setEditingUser(null)}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <div className="user-modal-summary">
                <span className="summary-name">{editingUser.displayName || "Chưa có tên"}</span>
                <span className="summary-email">{editingUser.email}</span>
              </div>

              <label className="modal-field-label">
                <span>Vai trò (Role)</span>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="modal-select"
                >
                  <option value="STUDENT">Học viên (STUDENT)</option>
                  <option value="MODERATOR">Kiểm duyệt viên (MODERATOR)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </label>

              <label className="modal-field-label">
                <span>Trạng thái tài khoản (Status)</span>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="modal-select"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_NAME_MAP[st]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setEditingUser(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={editSaving}
                  className="btn-modal-submit"
                  onClick={handleSaveEdit}
                >
                  {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Xác nhận xóa người dùng */}
      {deletingUser && (
        <div className="admin-modal-backdrop" onClick={() => setDeletingUser(null)}>
          <div className="admin-modal-dialog modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận xóa tài khoản</h3>
              <button type="button" className="btn-modal-close" onClick={() => setDeletingUser(null)}>
                ✕
              </button>
            </div>
            <div className="modal-form-body">
              <p className="modal-description">
                Bạn có chắc chắn muốn xóa tài khoản <strong>{deletingUser.email}</strong> (#{deletingUser.id}) không?
                Hành động này không thể hoàn tác.
              </p>
              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setDeletingUser(null)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  className="btn-modal-delete"
                  onClick={handleDeleteUser}
                >
                  {deleteLoading ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
