// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface UserResponse {
  id: number;
  roleId?: number | null;
  displayName?: string | null;
  fullName?: string | null;
  email: string;
  googleSub?: string | null;
  role?: string | null;
  roleName?: string | null;
  avatarUrl?: string;
  avatarPublicId?: string | null;
  status?: string | null;
  statusReason?: string | null;
  coinBalance?: number | null;
  currentStreak?: number | null;
  longestStreak?: number | null;
  lastStudyDate?: string | null;
  reminderEnabled?: boolean | null;
  reminderTime?: string | null;
  lastLogin?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  dateOfBirth?: string | null;
  reviewedById?: number | null;
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  createdById?: number | null;
  createdByEmail?: string | null;
  accessToken?: string;
}

export interface UpdateProfileRequest {
  displayName?: string | null;
  fullName?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
}

// ─── Auth State ───────────────────────────────────────────────────────────────

export interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (
    user: UserResponse,
    accessToken: string,
  ) => void;
  setUser: (user: UserResponse | null) => void;
  setTokens: (accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

