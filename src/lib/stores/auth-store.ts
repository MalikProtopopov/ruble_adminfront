import { create } from "zustand";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

const ADMIN_PROFILE_KEY = "porublyu_admin_profile";

function readAdminProfile(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ADMIN_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

interface AuthState {
  accessToken: string | null;
  admin: AdminUser | null;
  setSession: (accessToken: string, admin: AdminUser) => void;
  setAccessToken: (accessToken: string) => void;
  logoutLocal: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  admin: null,
  setSession: (accessToken, admin) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin));
    }
    set({ accessToken, admin });
  },
  setAccessToken: (accessToken) =>
    set((state) => ({
      accessToken,
      admin: state.admin ?? readAdminProfile(),
    })),
  logoutLocal: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ADMIN_PROFILE_KEY);
    }
    set({ accessToken: null, admin: null });
  },
}));
