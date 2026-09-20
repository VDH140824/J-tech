import axios from "axios";
import { useAuthStore } from "../store/authStore";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ─── Request interceptor: attach access token ─────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token =
    useAuthStore.getState().accessToken ?? localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 errors that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken =
      useAuthStore.getState().refreshToken ??
      localStorage.getItem("refreshToken");

    // No refresh token available — log out and reject
    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the request until the refresh resolves
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${baseURL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true },
      );

      const newAccessToken: string = data.accessToken ?? data.token;
      const newRefreshToken: string | undefined =
        data.refreshToken ?? undefined;

      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);

      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export const googleOAuthConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "",
  redirectUri:
    import.meta.env.VITE_GOOGLE_REDIRECT_URI ??
    "http://localhost:5173/login/oauth2/code/google",
  scope: "email profile",
  backendAuthUrl:
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api",
};
