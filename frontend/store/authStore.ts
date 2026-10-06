import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, UserResponse } from "../types/auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user: UserResponse, accessToken: string) => {
        set({
          user,
          accessToken,
          isAuthenticated: true,
        });
      },

      setUser: (user: UserResponse | null) => set({ user }),

      setTokens: (accessToken: string) => {
        set({
          accessToken,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      setLoading: (isLoading: boolean) => set({ isLoading }),
    }),
    {
      name: "auth-storage",
      version: 1,
      // Persist accessToken + user so useCurrentUser can fire after page reload
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
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
          };
        }
        // For version >= 1, return as-is
        return persistedState as Record<string, unknown>;
      },
    },
  ),
);
