import { apiClient } from "../services/api";
import type { SystemLog, SystemLogFilters, SystemLogPage } from "../types/admin";
import type {
  AdminDashboardStatsResponse,
  AdminUserStatusRequest,
  AdminUsersPageResponse,
} from "../types/admin";
import type { UserResponse } from "../types/auth";

export async function getSystemLogs(params: SystemLogFilters, signal?: AbortSignal): Promise<SystemLogPage> {
  const { data } = await apiClient.get<SystemLogPage>("/admin/system-logs", { params, signal });
  return data;
}

export async function getSystemLog(id: string, signal?: AbortSignal): Promise<SystemLog> {
  const { data } = await apiClient.get<SystemLog>(`/admin/system-logs/${encodeURIComponent(id)}`, { signal });
  return data;
}

/**
 * GET /api/admin/stats/dashboard
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStatsResponse> {
  const { data } = await apiClient.get<AdminDashboardStatsResponse>("/admin/stats/dashboard");
  return data;
}

/**
 * GET /api/admin/users
 */
export async function getAdminUsers(params: {
  search?: string;
  roleId?: number;
  status?: string;
  page?: number;
  size?: number;
}): Promise<AdminUsersPageResponse> {
  const { data } = await apiClient.get<AdminUsersPageResponse>("/admin/users", { params });
  return data;
}

/**
 * GET /api/admin/users/pending
 */
export async function getPendingAdminUsers(
  params: { page?: number; size?: number } = {},
): Promise<AdminUsersPageResponse> {
  const { data } = await apiClient.get<AdminUsersPageResponse>("/admin/users/pending", { params });
  return data;
}

/** PUT /api/admin/users/:id/approve */
export async function approvePendingUser(userId: number): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/admin/users/${userId}/approve`);
  return data;
}

/** PUT /api/admin/users/:id/reject */
export async function rejectPendingUser(userId: number, statusReason: string): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/admin/users/${userId}/reject`, { statusReason });
  return data;
}

/**
 * PATCH /api/admin/users/:id/status
 */
export async function changeAdminUserRole(
  userId: number,
  role: "STUDENT" | "MODERATOR" | "ADMIN",
): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function updateAdminUserStatus(
  userId: number,
  payload: AdminUserStatusRequest,
): Promise<UserResponse> {
  const { data } = await apiClient.patch<UserResponse>(`/admin/users/${userId}/status`, payload);
  return data;
}

/**
 * DELETE /api/admin/users/:id
 */
export async function deleteAdminUser(userId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

/**
 * POST /api/admin/users/pre-create
 */
export async function preCreateAdminUser(payload: {
  email: string;
  role: "STUDENT" | "MODERATOR" | "ADMIN";
}): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>("/admin/users/pre-create", payload);
  return data;
}
