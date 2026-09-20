import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import * as authApi from "../api/authApi";
import { useAuthStore } from "../store/authStore";
export const authKeys = { all: ["auth"] as const, me: (accessToken: string | null) => ["auth", "me", accessToken] as const };
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); const accessToken = useAuthStore((s) => s.accessToken); const setAuth = useAuthStore((s) => s.setAuth);
  return useQuery({ queryKey: authKeys.me(accessToken), queryFn: async () => { const user = await authApi.getCurrentUser(); const token = accessToken ?? useAuthStore.getState().accessToken ?? ""; if (token) setAuth(user, token, useAuthStore.getState().refreshToken ?? undefined); return user; }, enabled: isAuthenticated && !!accessToken, staleTime: 1000 * 60 * 5, retry: false });
}
export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth); const queryClient = useQueryClient(); const navigate = useNavigate();
  return useMutation({ mutationFn: () => authApi.logout(useAuthStore.getState().refreshToken), onSettled: () => { clearAuth(); queryClient.clear(); navigate("/login"); } });
}