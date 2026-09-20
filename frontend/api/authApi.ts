import { apiClient } from "../services/api";
import type {
  RefreshTokenRequest,
  UpdateProfileRequest,
  UserResponse,
} from "../types/auth";

/**
 * POST /api/auth/refresh
 * Exchange a refresh token for a new access token.
 */
export async function refreshToken(
  payload: RefreshTokenRequest,
): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>("/auth/refresh", payload);
  return data;
}

/**
 * POST /api/auth/logout
 * Invalidates the active refresh token on the server.
 */
export async function logout(refreshToken?: string | null): Promise<void> {
  await apiClient.post("/auth/logout", refreshToken ? { refreshToken } : undefined);
}

/**
 * GET /api/users/me
 * Returns the currently authenticated user's profile.
 */
export async function getCurrentUser(): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>("/users/me");
  return data;
}

export async function updateProfile(
  userId: number,
  payload: UpdateProfileRequest,
): Promise<UserResponse> {
  const { data } = await apiClient.put<UserResponse>(
    "/users/profile",
    payload,
    {
      params: { userId },
    },
  );
  return data;
}
