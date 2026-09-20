import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, UserResponse } from "../types/auth";

const TOKEN_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";
const AUTH_STORAGE_KEY = "auth-storage";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: localStorage.getItem(TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_KEY),
      isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
      isLoading: false,

      setAuth: (user: UserResponse, accessToken: string, refreshToken?: string) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        if (refreshToken) {
          localStorage.setItem(REFRESH_KEY, refreshToken);
        } else {
          localStorage.removeItem(REFRESH_KEY);
        }
        set({
          user,
          accessToken,
          refreshToken: refreshToken ?? null,
          isAuthenticated: true,
        });
      },

      setUser: (user: UserResponse | null) => set({ user }),

      setTokens: (accessToken: string, refreshToken?: string) => {
        localStorage.setItem(TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
        }));
      },

      clearAuth: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: "auth-storage",
      version: 1,
      // Persist tokens + user so useCurrentUser can fire after page reload
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      // Migrate old persisted state (version 0) that didn't have accessToken
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Old state didn't persist tokens → force logout so user re-logs in
          // and gets fresh role data from the server
          return {
            user: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
          };
        }
        // For version >= 1, return as-is
        return persistedState as Record<string, unknown>;
      },
    },
  ),
);
