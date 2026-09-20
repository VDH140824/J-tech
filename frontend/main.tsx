import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { AppRouter } from "./router/AppRouter";
import { useAuthStore } from "./store/authStore";
import "./index.css";

// ── Bootstrap: after Zustand persist hydrates, ensure the accessToken in the
// store matches what is in raw localStorage. This is needed when migrating
// from v0 (which didn't persist tokens) so that useCurrentUser can fire.
const bootstrap = () => {
  const rawToken = localStorage.getItem("accessToken");
  const rawRefresh = localStorage.getItem("refreshToken");
  const state = useAuthStore.getState();

  if (rawToken && !state.accessToken) {
    // Rehydrate tokens from raw localStorage – user was previously logged in
    useAuthStore.setState({
      accessToken: rawToken,
      refreshToken: rawRefresh,
      isAuthenticated: true,
    });
  }
};

bootstrap();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
