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

function getDisplayName(user: UserResponse): string {
  return user.displayName || user.email;
}

export function AdminUsersTab() {
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
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);
  const [changingRoleUser, setChangingRoleUser] = useState<UserResponse | null>(
    null,
  );
  const [roleLoadingId, setRoleLoadingId] = useState<number | null>(null);
  const [showPreCreate, setShowPreCreate] = useState(false);
  const [preCreateEmail, setPreCreateEmail] = useState("");
  const [preCreateRole, setPreCreateRole] = useState<"STUDENT" | "MODERATOR" | "ADMIN">("MODERATOR");
  const [preCreateLoading, setPreCreateLoading] = useState(false);

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
      setError(
        err?.response?.data?.message || "Không thể tải danh sách tài khoản.",
      );
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

  const handlePreCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preCreateEmail.trim()) return;
    try {
      setPreCreateLoading(true);
      await preCreateAdminUser({ email: preCreateEmail.trim(), role: preCreateRole });
      showNotification(`Đã tạo tài khoản ${preCreateEmail.trim()} với role ${preCreateRole}!`);
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

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleChangeStatus = async (userId: number, newStatus: UserStatus) => {
    try {
      await updateAdminUserStatus(userId, { status: newStatus });
      showNotification(`Đã đổi trạng thái tài khoản sang ${newStatus}!`);
      fetchUsers();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Không thể đổi trạng thái tài khoản.",
      );
    }
  };

  const handleChangeRole = async (
    targetUser: UserResponse,
    role: "STUDENT" | "MODERATOR" | "ADMIN",
  ) => {
    if (targetUser.role === role) return;
    try {
      setRoleLoadingId(targetUser.id);
      const updated = await changeAdminUserRole(targetUser.id, role);
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? updated : user)),
      );
      showNotification(`Đã đổi role sang ${role}!`);
      setChangingRoleUser(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể đổi role tài khoản.");
    } finally {
      setRoleLoadingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      const userId = deletingUser.id;
      await deleteAdminUser(userId);
      setDeletingUser(null);
      showNotification("Đã xóa tài khoản thành công!");
      fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể xóa tài khoản.");
    }
  };

  return (
    <section className="admin-tab-content users-tab">
      <div className="admin-section-header">
        <div>
          <h2>Quản lý tài khoản</h2>
          <p>Admin quản lý danh sách, trạng thái và quyền tài khoản.</p>
        </div>
        <button
          type="button"
          className="admin-btn-primary"
          onClick={() => setShowPreCreate(true)}
        >
          ➕ Tạo tài khoản
        </button>
      </div>

      {actionSuccess && (
        <div className="admin-success-message">✅ {actionSuccess}</div>
      )}
      {error && <div className="admin-error-message">⚠️ {error}</div>}

      <form className="admin-toolbar" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder="Tìm theo email hoặc tên hiển thị..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search-input"
        />
        <select
          value={roleIdFilter}
          onChange={(e) => {
            setRoleIdFilter(e.target.value);
            setPage(0);
          }}
          className="admin-filter-select"
        >
          <option value="ALL">Tất cả vai trò</option>
          <option value="1">Admin</option>
          <option value="2">Student</option>
          <option value="3">Moderator</option>
        </select>
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
              {status}
            </option>
          ))}
        </select>
        <button type="submit" className="admin-btn-primary">
          Tìm kiếm
        </button>
      </form>

      {loading ? (
        <div className="admin-loading">Đang tải danh sách tài khoản...</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên hiển thị</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Đăng nhập cuối</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-empty">
                    Không có tài khoản phù hợp.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const userId = user.id;
                  return (
                    <tr key={userId}>
                      <td>#{userId}</td>
                      <td>{getDisplayName(user)}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={
                            user.role === "ADMIN"
                              ? "ADMIN"
                              : user.role === "MODERATOR"
                                ? "MODERATOR"
                                : "STUDENT"
                          }
                          disabled={roleLoadingId === user.id}
                          onChange={(e) => {
                            const nextRole = e.target.value as
                              | "STUDENT"
                              | "MODERATOR"
                              | "ADMIN";
                            if (
                              window.confirm(
                                `Bạn có chắc muốn đổi role từ ${user.role || "STUDENT"} sang ${nextRole}?`,
                              )
                            ) {
                              setChangingRoleUser(user);
                              void handleChangeRole(user, nextRole);
                            }
                          }}
                          className="status-select"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                        {roleLoadingId === user.id && (
                          <small> Đang lưu...</small>
                        )}
                      </td>
                      <td>
                        <select
                          value={(user.status as UserStatus) || "PENDING"}
                          onChange={(e) =>
                            handleChangeStatus(
                              userId,
                              e.target.value as UserStatus,
                            )
                          }
                          className="status-select"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleString("vi-VN")
                          : "Chưa có"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-action btn-delete"
                          onClick={() => setDeletingUser(user)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-pagination">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Trang trước
        </button>
        <span>
          Trang {page + 1}/{totalPages} • {totalElements} tài khoản
        </span>
        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </button>
      </div>

      {deletingUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <h3>⚠️ Xác nhận xóa tài khoản</h3>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="btn-close-modal"
              >
                ✕
              </button>
            </div>
            <p>
              Bạn chắc chắn muốn xóa tài khoản{" "}
              <strong>{getDisplayName(deletingUser)}</strong>?
            </p>
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="admin-btn-cancel"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="admin-btn-delete"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreCreate && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <h3>➕ Tạo tài khoản trước</h3>
              <button
                type="button"
                onClick={() => { setShowPreCreate(false); setPreCreateEmail(""); setError(null); }}
                className="btn-close-modal"
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: "0 0 16px" }}>
              Nhập email Google và chọn role. Tài khoản sẽ được set <strong style={{color:"#3fb950"}}>ACTIVE</strong> ngay lập tức — người dùng có thể đăng nhập vào hệ thống với đúng role đã chọn.
            </p>
            <form onSubmit={handlePreCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#8b949e", marginBottom: 6 }}>Email Google *</label>
                <input
                  id="pre-create-email"
                  type="email"
                  required
                  placeholder="example@gmail.com"
                  value={preCreateEmail}
                  onChange={(e) => setPreCreateEmail(e.target.value)}
                  className="admin-search-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#8b949e", marginBottom: 6 }}>Role *</label>
                <select
                  id="pre-create-role"
                  value={preCreateRole}
                  onChange={(e) => setPreCreateRole(e.target.value as "STUDENT" | "MODERATOR" | "ADMIN")}
                  className="admin-filter-select"
                  style={{ width: "100%" }}
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => { setShowPreCreate(false); setPreCreateEmail(""); setError(null); }}
                  className="admin-btn-cancel"
                  disabled={preCreateLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={preCreateLoading}
                >
                  {preCreateLoading ? "Đang tạo..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
