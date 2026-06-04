import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Per-user PIN hashes — never shared across patient accounts on the same device. */
type PinByUser = Record<string, string>;

interface PinStore {
  activeUserId: string | null;
  pinsByUser: PinByUser;
  pinHash: string | null;
  isLocked: boolean;
  isHydrated: boolean;
  setActiveUser: (userId: string | null) => void;
  setPin: (pin: string) => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: (pin: string) => Promise<boolean>;
  unlock: () => void;
  lock: () => void;
  _setHydrated: () => void;
}

function syncActivePin(state: {
  activeUserId: string | null;
  pinsByUser: PinByUser;
  isLocked?: boolean;
}): { pinHash: string | null; isLocked: boolean } {
  const pinHash = state.activeUserId
    ? state.pinsByUser[state.activeUserId] ?? null
    : null;
  return {
    pinHash,
    isLocked: pinHash ? (state.isLocked ?? true) : false,
  };
}

export const usePinStore = create<PinStore>()(
  persist(
    (set, get) => ({
      activeUserId: null,
      pinsByUser: {},
      pinHash: null,
      isLocked: true,
      isHydrated: false,
      _setHydrated: () => set({ isHydrated: true }),

      setActiveUser: (userId) => {
        const { pinsByUser } = get();
        const pinHash = userId ? pinsByUser[userId] ?? null : null;
        set({
          activeUserId: userId,
          pinHash,
          isLocked: !!pinHash,
        });
      },

      setPin: async (pin) => {
        const userId = get().activeUserId;
        if (!userId) return;
        const hash = await sha256(pin);
        const pinsByUser = { ...get().pinsByUser, [userId]: hash };
        set({ pinsByUser, pinHash: hash, isLocked: false });
      },

      changePin: async (currentPin, newPin) => {
        const userId = get().activeUserId;
        const cur = userId ? get().pinsByUser[userId] : null;
        if (!userId || !cur) return false;
        const test = await sha256(currentPin);
        if (test !== cur) return false;
        const hash = await sha256(newPin);
        const pinsByUser = { ...get().pinsByUser, [userId]: hash };
        set({ pinsByUser, pinHash: hash });
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
        const userId = get().activeUserId;
        const cur = userId ? get().pinsByUser[userId] : null;
        if (!userId || !cur) return true;
        const test = await sha256(pin);
        if (test !== cur) return false;
        const pinsByUser = { ...get().pinsByUser };
        delete pinsByUser[userId];
        set({ pinsByUser, pinHash: null, isLocked: false });
        return true;
      },

      unlock: () => set({ isLocked: false }),
      lock: () => {
        if (get().pinHash) set({ isLocked: true });
      },
    }),
    {
      name: "farumasi_pin_v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ pinsByUser: s.pinsByUser }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state._setHydrated();
        const synced = syncActivePin({
          activeUserId: state.activeUserId,
          pinsByUser: state.pinsByUser ?? {},
          isLocked: true,
        });
        state.pinHash = synced.pinHash;
        state.isLocked = synced.isLocked;
      },
    }
  )
);
