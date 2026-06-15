import { create } from "zustand";
import { authService } from "@/lib/services/auth.service";
import { patientsService } from "@/lib/services/patients.service";
import { isMockMode } from "@/lib/env";
import type { AuthUser } from "@/types";
import { usePinStore } from "@/store/pin-store";

async function syncPatientPinStatus(): Promise<void> {
  try {
    const profile = await patientsService.getMyProfile();
    usePinStore.getState().syncServerPinStatus(!!profile.has_pin);
  } catch {
    usePinStore.getState().syncServerPinStatus(false);
  }
}

interface AuthStore {
  isGuest: boolean;
  /** True while hydrateAuth is resolving — prevents GuestGate from flashing lock screen */
  isHydrating: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  /** Sign in with email + password; fetches user profile automatically */
  login: (email: string, password: string) => Promise<void>;
  /** Register new patient account — returns pending OTP step */
  register: (params: { full_name: string; email: string; phone?: string; password: string }) => Promise<{ email: string; expires_minutes: number }>;
  verifyRegistration: (email: string, code: string) => Promise<void>;
  resendRegistrationOtp: (email: string) => Promise<void>;
  /** Clear session */
  logout: () => void;
  /** Rehydrate tokens from localStorage on client mount */
  hydrateAuth: () => Promise<void>;
  /** Manually set user (after profile update) */
  setUser: (user: AuthUser) => void;
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem("farumasi_access_token", access);
  localStorage.setItem("farumasi_refresh_token", refresh);
  localStorage.setItem("farumasi_auth", "true");
}

function clearTokens() {
  localStorage.removeItem("farumasi_access_token");
  localStorage.removeItem("farumasi_refresh_token");
  localStorage.removeItem("farumasi_auth");
}

export const useAuthStore = create<AuthStore>()((set) => ({
  isGuest: true,
  isHydrating: true,
  user: null,
  accessToken: null,

  login: async (email, password) => {
    if (isMockMode()) {
      const mockUser: AuthUser = { id: "mock-1", name: "Demo Patient", email, phone: "+250788000000", role: "patient" };
      saveTokens("mock-token", "mock-refresh");
      set({ isGuest: false, user: mockUser, accessToken: "mock-token" });
      return;
    }
    const tokens = await authService.login(email, password);
    saveTokens(tokens.access_token, tokens.refresh_token);
    const user = await authService.getMe();
    usePinStore.getState().setActiveUser(user.id);
    await syncPatientPinStatus();
    set({ isGuest: false, user, accessToken: tokens.access_token });
  },

  register: async (params) => {
    const pending = await authService.register(params);
    return { email: pending.email, expires_minutes: pending.expires_minutes };
  },

  verifyRegistration: async (email, code) => {
    const tokens = await authService.verifyRegistration(email, code);
    saveTokens(tokens.access_token, tokens.refresh_token);
    const user = await authService.getMe();
    usePinStore.getState().setActiveUser(user.id);
    await syncPatientPinStatus();
    set({ isGuest: false, user, accessToken: tokens.access_token });
  },

  resendRegistrationOtp: async (email) => {
    await authService.resendRegistrationOtp(email);
  },

  logout: () => {
    if (typeof window !== "undefined") clearTokens();
    usePinStore.getState().setActiveUser(null);
    set({ isGuest: true, user: null, accessToken: null });
  },

  hydrateAuth: async () => {
    if (typeof window === "undefined") return;
    if (isMockMode()) {
      const token = localStorage.getItem("farumasi_access_token");
      if (!token) { set({ isGuest: true, isHydrating: false }); return; }
      const mockUser = { id: "mock-1", name: "Demo Patient", email: "patient@farumasi.com", phone: "+250788000000", role: "patient" as const };
      usePinStore.getState().setActiveUser(mockUser.id);
      set({ isGuest: false, isHydrating: false, accessToken: token, user: mockUser });
      return;
    }
    const token = localStorage.getItem("farumasi_access_token");
    if (!token) { set({ isGuest: true, isHydrating: false }); return; }

    // Unblock UI immediately; validate session in background.
    set({ isGuest: false, isHydrating: false, accessToken: token });

    try {
      const user = await authService.getMe();
      usePinStore.getState().setActiveUser(user.id);
      await syncPatientPinStatus();
      set({ user, accessToken: token });
    } catch {
      clearTokens();
      usePinStore.getState().setActiveUser(null);
      set({ isGuest: true, user: null, accessToken: null });
    }
  },

  setUser: (user) => set({ user }),
}));
