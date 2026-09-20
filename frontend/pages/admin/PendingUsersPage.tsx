import { useEffect, useState } from "react";
import { approvePendingUser, getPendingAdminUsers, rejectPendingUser } from "../../api/adminApi";
import type { UserResponse } from "../../types/auth";

export function PendingUsersPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPendingAdminUsers({ size: 100 });
      setUsers(response.content ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to load pending accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const changeStatus = async (userId: number, action: "approve" | "reject") => {
    try {
      setProcessingId(userId);
      if (action === "approve") await approvePendingUser(userId);
      else await rejectPendingUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to update this account.");
    } finally {
      setProcessingId(null);
    }
  };

  return <section className="admin-tab-content">
    <div className="admin-tab-header">
      <div><h1 className="admin-tab-title">Pending account approvals</h1><p className="admin-tab-subtitle">Review new Google accounts before granting application access.</p></div>
      <button type="button" className="admin-refresh-btn" onClick={loadUsers}>Refresh</button>
    </div>
    {error && <div className="admin-error-box">⚠️ {error}</div>}
    {loading ? <div className="admin-loading-container"><div className="admin-spinner" /><p>Loading pending accounts...</p></div> :
      <div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>User</th><th>Email</th><th>Registered</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {users.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-400">There are no accounts waiting for approval.</td></tr> : users.map((user) => {
          const id = user.userId ?? user.id;
          const processing = processingId === id;
          return <tr key={id}><td><div className="user-table-cell"><div className="user-table-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt={user.username} /> : <span>{user.username.charAt(0).toUpperCase()}</span>}</div><span className="user-table-name">{user.username}</span></div></td><td>{user.email}</td><td>{user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</td><td><span className="status-badge status-pending">PENDING</span></td><td><div className="action-buttons-group"><button type="button" className="btn-action btn-edit" disabled={processing} onClick={() => changeStatus(id, "approve")}>Approve</button><button type="button" className="btn-action btn-delete" disabled={processing} onClick={() => changeStatus(id, "reject")}>Reject</button></div></td></tr>;
        })}</tbody></table></div>}
  </section>;
}
