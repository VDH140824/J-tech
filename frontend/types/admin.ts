import type { UserResponse } from "./auth";

export interface SystemLog {
  id: number;
  userId: number | null;
  fullName: string | null;
  email: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  level: "INFO" | "WARNING" | "ERROR";
  detail: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface SystemLogFilters {
  search?: string;
  level?: string;
  entityType?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface SystemLogPage {
  content: SystemLog[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

export interface AdminUserStatusRequest {
  status: "PENDING" | "ACTIVE" | "REJECTED" | "LOCKED";
  statusReason?: string | null;
}

export interface CategoryStat {
  categoryName: string;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
}

export interface MonthlyStat {
  label: string;
  value: number;
}

export interface AdminDashboardStatsResponse {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  rejectedUsers: number;
  lockedUsers: number;
  userGrowthStats: MonthlyStat[];
}

export interface AdminUsersPageResponse {
  content: UserResponse[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  last: boolean;
}
