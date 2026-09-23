// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface UserResponse {
  id: number;
  roleId?: number | null;
  displayName?: string | null;
  email: string;
  role?: string | null;
  avatarUrl?: string;
  status?: string | null;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  birthday?: string | null;
  accessToken?: string;
  refreshToken?: string;
}

export interface UpdateProfileRequest {
  fullName?: string | null;
  birthday?: string | null;
}

// ─── Auth State ───────────────────────────────────────────────────────────────

export interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (
    user: UserResponse,
    accessToken: string,
    refreshToken?: string,
  ) => void;
  setUser: (user: UserResponse | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

