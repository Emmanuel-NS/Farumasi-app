import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "@/lib/api";

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
  /** Server has a PIN but this device has not cached a hash yet. */
  serverPinRequired: boolean;
  isLocked: boolean;
  isHydrated: boolean;
  setActiveUser: (userId: string | null) => void;
  syncServerPinStatus: (hasPin: boolean) => void;
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
  serverPinRequired?: boolean;
  isLocked?: boolean;
}): { pinHash: string | null; serverPinRequired: boolean; isLocked: boolean } {
  const pinHash = state.activeUserId
    ? state.pinsByUser[state.activeUserId] ?? null
    : null;
  const serverPinRequired = pinHash ? false : Boolean(state.serverPinRequired);
  const protected_ = Boolean(pinHash || serverPinRequired);
  return {
    pinHash,
    serverPinRequired,
    isLocked: protected_ ? (state.isLocked ?? true) : false,
  };
}

export const usePinStore = create<PinStore>()(
  persist(
    (set, get) => ({
      activeUserId: null,
      pinsByUser: {},
      pinHash: null,
      serverPinRequired: false,
      isLocked: false,
      isHydrated: false,
      _setHydrated: () => set({ isHydrated: true }),

      setActiveUser: (userId) => {
        const synced = syncActivePin({
          activeUserId: userId,
          pinsByUser: get().pinsByUser,
          serverPinRequired: false,
          isLocked: true,
        });
        set({
          activeUserId: userId,
          ...synced,
        });
      },

      syncServerPinStatus: (hasPin) => {
        const userId = get().activeUserId;
        if (!userId) {
          set({ serverPinRequired: false, isLocked: false });
          return;
        }
        const localHash = get().pinsByUser[userId] ?? null;
        const serverPinRequired = hasPin && !localHash;
        set(
          syncActivePin({
            activeUserId: userId,
            pinsByUser: get().pinsByUser,
            serverPinRequired,
            isLocked: true,
          }),
        );
      },

      setPin: async (pin) => {
        const userId = get().activeUserId;
        if (!userId) throw new Error("Sign in to set a PIN.");
        const hash = await sha256(pin);
        const pinsByUser = { ...get().pinsByUser, [userId]: hash };
        set({
          pinsByUser,
          pinHash: hash,
          serverPinRequired: false,
          isLocked: false,
        });
        await api.put("/patients/me/pin", { pin });
      },

      changePin: async (currentPin, newPin) => {
        const userId = get().activeUserId;
        if (!userId) return false;
        const cur = get().pinsByUser[userId];
        if (cur) {
          const test = await sha256(currentPin);
          if (test !== cur) return false;
        } else if (get().serverPinRequired) {
          try {
            await api.post("/patients/me/pin/verify", { pin: currentPin });
          } catch {
            return false;
          }
        } else {
          return false;
        }
        const hash = await sha256(newPin);
        const pinsByUser = { ...get().pinsByUser, [userId]: hash };
        set({ pinsByUser, pinHash: hash, serverPinRequired: false });
        await api.put("/patients/me/pin/change", {
          current_pin: currentPin,
          new_pin: newPin,
        });
        return true;
      },

      verifyPin: async (pin) => {
        const cur = get().pinHash;
        if (cur) {
          const test = await sha256(pin);
          if (test === cur) {
            set({ isLocked: false });
            return true;
          }
          return false;
        }
        if (get().serverPinRequired) {
          try {
            await api.post("/patients/me/pin/verify", { pin });
            set({ isLocked: false });
            return true;
          } catch {
            return false;
          }
        }
        set({ isLocked: false });
        return true;
      },

      clearPin: async (pin) => {
        const userId = get().activeUserId;
        if (!userId) return false;
        const cur = get().pinsByUser[userId];
        if (cur) {
          const test = await sha256(pin);
          if (test !== cur) return false;
        } else if (get().serverPinRequired) {
          try {
            await api.post("/patients/me/pin/verify", { pin });
          } catch {
            return false;
          }
        } else {
          return true;
        }
        const pinsByUser = { ...get().pinsByUser };
        delete pinsByUser[userId];
        set({
          pinsByUser,
          pinHash: null,
          serverPinRequired: false,
          isLocked: false,
        });
        await api.delete("/patients/me/pin", { data: { pin } });
        return true;
      },

      unlock: () => set({ isLocked: false }),
      lock: () => {
        if (get().pinHash || get().serverPinRequired) set({ isLocked: true });
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
          serverPinRequired: state.serverPinRequired ?? false,
          isLocked: true,
        });
        state.pinHash = synced.pinHash;
        state.serverPinRequired = synced.serverPinRequired;
        state.isLocked = synced.isLocked;
      },
    },
  ),
);
