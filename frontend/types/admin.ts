import type { UserResponse } from "./auth";

export interface AdminUserStatusRequest {
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "LOCKED" | "BANNED";
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
  inactiveUsers: number;
  bannedUsers: number;
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

