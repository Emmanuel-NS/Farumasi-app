import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface PinStore {
  pinHash: string | null;
  isLocked: boolean;
  isHydrated: boolean;
  setPin: (pin: string) => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  _setHydrated: () => void;
}

export const usePinStore = create<PinStore>()(
  persist(
    (set, get) => ({
      pinHash: null,
      isLocked: true,
      isHydrated: false,
      _setHydrated: () => set({ isHydrated: true }),
      setPin: async (pin) => {
        const hash = await sha256(pin);
        set({ pinHash: hash, isLocked: false });
      },
      changePin: async (currentPin, newPin) => {
        const cur = get().pinHash;
        if (!cur) return false;
        const test = await sha256(currentPin);
        if (test !== cur) return false;
        const hash = await sha256(newPin);
        set({ pinHash: hash });
        return true;
      },
      verifyPin: async (pin) => {
        const cur = get().pinHash;
        if (!cur) return true;
        const test = await sha256(pin);
        const ok = test === cur;
        if (ok) set({ isLocked: false });
        return ok;
      },
      clearPin: async (pin) => {
        const cur = get().pinHash;
        if (!cur) return true;
        const test = await sha256(pin);
        if (test !== cur) return false;
        set({ pinHash: null, isLocked: false });
        return true;
      },
      unlock: () => set({ isLocked: false }),
      lock: () => set({ isLocked: true }),
    }),
    {
      name: "farumasi_pin",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ pinHash: s.pinHash }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
        // Always lock again on fresh load
        if (state?.pinHash) state.isLocked = true;
      },
    }
  )
);
