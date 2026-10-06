import { apiClient } from "../services/api";
import type {
  UpdateProfileRequest,
  UserResponse,
} from "../types/auth";

/**
 * POST /api/auth/exchange
 * Exchanges a one-time OAuth2 exchange code (or cookie) for user info and tokens.
 */
export async function exchangeOAuth2Code(code?: string): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>("/auth/exchange", code ? { code } : {});
  return data;
}

/**
 * POST /api/auth/refresh
 * Exchange HttpOnly cookie for a new access token.
 */
export async function refreshToken(): Promise<UserResponse> {
  const { data } = await apiClient.post<UserResponse>("/auth/refresh");
  return data;
}

/**
 * POST /api/auth/logout
 * Invalidates the active refresh token cookie on the server.
 */
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
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
