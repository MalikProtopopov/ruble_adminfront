import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/lib/stores/auth-store";

declare module "axios" {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const baseURL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || ""
    : process.env.NEXT_PUBLIC_API_URL || "";

export const adminClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error("refresh failed");
  }
  const data = (await res.json()) as { access_token: string };
  useAuthStore.getState().setAccessToken(data.access_token);
}

adminClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    if (original.url?.includes("/auth/")) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      await refreshPromise;
      const token = useAuthStore.getState().accessToken;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
      }
      return adminClient(original);
    } catch {
      useAuthStore.getState().logoutLocal();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  },
);
