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
}

export interface UpdateProfileRequest {
  fullName?: string | null;
  birthday?: string | null;
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

