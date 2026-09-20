import { useEffect, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
} from "../../api/adminApi";
import type { UserResponse } from "../../types/auth";

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

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserResponse | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    roleId: 2, // default USER
    status: "ACTIVE",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

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

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleOpenAddModal = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      roleId: 2,
      status: "ACTIVE",
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: UserResponse) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      roleId: user.roleId ?? (user.role === "ADMIN" ? 1 : user.role === "MODERATOR" ? 3 : 2),
      status: user.status ?? "ACTIVE",
    });
    setFormError(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      if (editingUser) {
        const uId = editingUser.userId ?? editingUser.id;
        await updateAdminUser(uId, {
          username: formData.username,
          email: formData.email,
          password: formData.password || undefined,
          roleId: formData.roleId,
          status: formData.status,
        });
        showNotification(`Đã cập nhật tài khoản ${formData.username} thành công!`);
        setEditingUser(null);
      } else {
        await createAdminUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          roleId: formData.roleId,
          status: formData.status,
        });
        showNotification(`Đã thêm mới tài khoản ${formData.username} thành công!`);
        setIsAddModalOpen(false);
      }
      fetchUsers();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Đã xảy ra lỗi khi lưu thông tin.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleChangeStatus = async (userId: number, newStatus: "PENDING" | "ACTIVE" | "INACTIVE" | "LOCKED" | "BANNED") => {
    try {
      await updateAdminUserStatus(userId, { status: newStatus });
      showNotification(`Đã đổi trạng thái tài khoản sang ${newStatus}!`);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể đổi trạng thái tài khoản.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const uId = deletingUser.userId ?? deletingUser.id;
    try {
      await deleteAdminUser(uId);
      showNotification(`Đã xóa tài khoản ${deletingUser.username}!`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Không thể xóa tài khoản.");
    }
  };

  const getRoleBadge = (roleName?: string | null, roleId?: number | null) => {
    const r = roleName?.toUpperCase() || (roleId === 1 ? "ADMIN" : roleId === 3 ? "MODERATOR" : "USER");
    if (r === "ADMIN" || r === "ROLE_ADMIN") return <span className="badge badge-admin">⚙️ Admin</span>;
    if (r === "MODERATOR" || r === "ROLE_MODERATOR") return <span className="badge badge-mod">🛡️ Kiểm duyệt</span>;
    return <span className="badge badge-user">👤 Thành viên</span>;
  };

  const getStatusBadge = (status?: string | null) => {
    const s = status?.toUpperCase() || "ACTIVE";
    if (s === "PENDING") return <span className="status-tag tag-pending">⏳ Chờ duyệt</span>;
    if (s === "ACTIVE") return <span className="status-tag tag-active">● Hoạt động</span>;
    if (s === "INACTIVE") return <span className="status-tag tag-inactive">○ Chưa kích hoạt</span>;
    if (s === "LOCKED") return <span className="status-tag tag-locked">🔒 Tạm khóa</span>;
    if (s === "BANNED") return <span className="status-tag tag-banned">🚫 Đã cấm</span>;
    return <span className="status-tag tag-unknown">{s}</span>;
  };

  return (
    <div className="admin-tab-content">
      {/* Header Banner */}
      <div className="admin-tab-header">
        <div>
          <h2 className="admin-tab-title">👤 Quản Lý Tài Khoản Người Dùng</h2>
          <p className="admin-tab-subtitle">Thêm mới, chỉnh sửa thông tin, phân quyền và khóa/cấm tài khoản trên hệ thống</p>
        </div>
        <button type="button" onClick={handleOpenAddModal} className="admin-btn-primary">
          ➕ Thêm tài khoản mới
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="admin-toast-success">
          ✨ {actionSuccess}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Tìm theo username hoặc email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-search"
          />
          <button type="submit" className="admin-btn-search">🔍 Tìm kiếm</button>
        </form>

        <div className="filter-group">
          <label>Role:</label>
          <select value={roleIdFilter} onChange={(e) => { setRoleIdFilter(e.target.value); setPage(0); }} className="admin-select">
            <option value="ALL">Tất cả Role</option>
            <option value="1">Admin (1)</option>
            <option value="2">User (2)</option>
            <option value="3">Moderator (3)</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Trạng thái:</label>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="admin-select">
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt (PENDING)</option>
            <option value="ACTIVE">Hoạt động (ACTIVE)</option>
            <option value="INACTIVE">Chưa kích hoạt (INACTIVE)</option>
            <option value="LOCKED">Tạm khóa (LOCKED)</option>
            <option value="BANNED">Bị cấm (BANNED)</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="admin-loading-container">
          <div className="admin-spinner" />
          <p>Đang tải danh sách người dùng...</p>
        </div>
      ) : error ? (
        <div className="admin-error-box">
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchUsers} className="admin-retry-btn">Thử lại</button>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Role</th>
                <th>Trạng thái</th>
                <th>Thao tác nhanh</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400">
                    Không tìm thấy tài khoản nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const userIdVal = u.userId ?? u.id;
                  return (
                    <tr key={userIdVal}>
                      <td>#{userIdVal}</td>
                      <td>
                        <div className="user-table-cell">
                          <div className="user-table-avatar">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.username} />
                            ) : (
                              <span>{u.username ? u.username.charAt(0).toUpperCase() : "U"}</span>
                            )}
                          </div>
                          <span className="user-table-name">{u.username}</span>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>{getRoleBadge(u.role, u.roleId)}</td>
                      <td>{getStatusBadge(u.status)}</td>
                      <td>
                        <select
                          value={u.status || "ACTIVE"}
                          onChange={(e) => handleChangeStatus(userIdVal, e.target.value as any)}
                          className="admin-select-status-quick"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="LOCKED">LOCKED</option>
                          <option value="BANNED">BANNED</option>
                        </select>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="btn-action btn-edit"
                            title="Chỉnh sửa tài khoản"
                          >
                            ✏️ Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingUser(u)}
                            className="btn-action btn-delete"
                            title="Xóa tài khoản"
                          >
                            🗑️ Xóa
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
      {!loading && totalPages > 1 && (
        <div className="admin-pagination">
          <span className="pagination-info">Hiển thị {users.length} trên tổng số {totalElements} tài khoản</span>
          <div className="pagination-buttons">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              className="page-btn"
            >
              ◄ Trang trước
            </button>
            <span className="current-page-tag">Trang {page + 1} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="page-btn"
            >
              Trang sau ►
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {(isAddModalOpen || editingUser) && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>{editingUser ? `✏️ Chỉnh Sửa Tài Khoản #${editingUser.userId ?? editingUser.id}` : "➕ Thêm Tài Khoản Mới"}</h3>
              <button
                type="button"
                onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }}
                className="btn-close-modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="admin-modal-form">
              {formError && <div className="modal-error-banner">⚠️ {formError}</div>}

              <div className="form-group">
                <label>Tên đăng nhập (Username) *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="admin-modal-input"
                  placeholder="Nhập username"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="admin-modal-input"
                  placeholder="Nhập email"
                />
              </div>

              <div className="form-group">
                <label>{editingUser ? "Mật khẩu mới (Bỏ trống nếu không đổi)" : "Mật khẩu *"}</label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="admin-modal-input"
                  placeholder={editingUser ? "Để trống nếu giữ nguyên" : "Nhập mật khẩu"}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>Role phân quyền *</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                    className="admin-modal-select"
                  >
                    <option value={1}>Admin (1)</option>
                    <option value={2}>User (2)</option>
                    <option value={3}>Moderator (3)</option>
                  </select>
                </div>

                <div className="form-group half">
                  <label>Trạng thái tài khoản *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="admin-modal-select"
                  >
                    <option value="PENDING">PENDING (Chờ duyệt)</option>
                    <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                    <option value="INACTIVE">INACTIVE (Chưa kích hoạt)</option>
                    <option value="LOCKED">LOCKED (Tạm khóa)</option>
                    <option value="BANNED">BANNED (Đã cấm)</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }}
                  className="admin-btn-cancel"
                >
                  Hủy bỏ
                </button>
                <button type="submit" disabled={formSubmitting} className="admin-btn-submit">
                  {formSubmitting ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card modal-sm">
            <div className="admin-modal-header">
              <h3>⚠️ Xác Nhận Xóa Tài Khoản</h3>
              <button type="button" onClick={() => setDeletingUser(null)} className="btn-close-modal">✕</button>
            </div>
            <div className="modal-body-padding">
              <p>Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong>{deletingUser.username}</strong> ({deletingUser.email}) không?</p>
              <p className="text-danger-sm">Hành động này không thể hoàn tác.</p>
            </div>
            <div className="admin-modal-footer">
              <button type="button" onClick={() => setDeletingUser(null)} className="admin-btn-cancel">Hủy</button>
              <button type="button" onClick={handleDeleteUser} className="admin-btn-danger">Xóa tài khoản</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
