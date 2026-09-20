// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface UserResponse {
  id: number;
  userId?: number;
  roleId?: number | null;
  username: string;
  email: string;
  role?: string | null;
  emailVerified: boolean;
  avatarUrl?: string;
  status?: string | null;
  lastLogin?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  birthday?: string | null;
  country?: string | null;
  nativeLanguage?: string | null;
  bio?: string | null;
  accessToken?: string;
  refreshToken?: string;
}

export interface UpdateProfileRequest {
  fullName?: string | null;
  birthday?: string | null;
  country?: string | null;
  nativeLanguage?: string | null;
  bio?: string | null;
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

