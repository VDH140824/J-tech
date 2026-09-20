import { apiClient } from "../services/api";
import type {
  AdminCreateUserRequest,
  AdminDashboardStatsResponse,
  AdminUpdateUserRequest,
  AdminUserStatusRequest,
  AdminUsersPageResponse,
} from "../types/admin";
import type { UserResponse } from "../types/auth";

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
 * POST /api/admin/users
 */
/**
 * GET /api/admin/users/pending
 */
export async function getPendingAdminUsers(params: { page?: number; size?: number } = {}): Promise<AdminUsersPageResponse> {
  const { data } = await apiClient.get<AdminUsersPageResponse>("/admin/users/pending", { params });
  return data;
}

/** PUT /api/admin/users/:id/approve */
export async function approvePendingUser(userId: number): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/admin/users/${userId}/approve`);
  return data;
}

/** PUT /api/admin/users/:id/reject */
export async function rejectPendingUser(userId: number): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/admin/users/${userId}/reject`);
  return data;
}

export async function createAdminUser(payload: AdminCreateUserRequest): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>("/admin/users", payload);
  return data;
}

/**
 * PUT /api/admin/users/:id
 */
export async function updateAdminUser(
  userId: number,
  payload: AdminUpdateUserRequest
): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(`/admin/users/${userId}`, payload);
  return data;
}

/**
 * PATCH /api/admin/users/:id/status
 */
export async function updateAdminUserStatus(
  userId: number,
  payload: AdminUserStatusRequest
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

