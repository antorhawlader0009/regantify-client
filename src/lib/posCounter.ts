import { create } from 'zustand';
import type { PosUnlock } from './posApi';
import { rememberUnlock } from './posOffline';

/*
 * The counter's own state (POS-system-plan.md Step 4): which register this
 * screen sells on, and who unlocked it with their PIN. Online, a reload or a
 * closed tab asks for the PIN again (offline, Step 13, the same tab carries on); the
 * register choice is remembered per browser (a convenience, safe to lose).
 */

const REGISTER_KEY = 'pos.registerId';

function readRegister(): string | null {
  try {
    return localStorage.getItem(REGISTER_KEY);
  } catch {
    return null;
  }
}

interface CounterState {
  registerId: string | null;
  unlock: PosUnlock | null;
  setRegister: (id: string | null) => void;
  setUnlock: (unlock: PosUnlock) => void;
  lock: () => void;
}

export const useCounter = create<CounterState>((set) => ({
  registerId: readRegister(),
  unlock: null,
  setRegister: (id) => {
    try {
      if (id) localStorage.setItem(REGISTER_KEY, id);
      else localStorage.removeItem(REGISTER_KEY);
    } catch {
      // Private window or blocked storage: the choice just isn't remembered.
    }
    set({ registerId: id });
  },
  // Step 13: the unlock is also kept in this tab's sessionStorage while unlocked, so a reload with
  // no internet can carry on as the same cashier (PosSellPage only uses it when offline).
  setUnlock: (unlock) => {
    rememberUnlock(unlock);
    set({ unlock });
  },
  lock: () => {
    rememberUnlock(null);
    set({ unlock: null });
  },
}));

/** True while an unlock is still within its 12 hours. */
export function unlockValid(unlock: PosUnlock | null): unlock is PosUnlock {
  return !!unlock && new Date(unlock.expiresAt).getTime() > Date.now();
}

/**
 * One id per sale, kept across retries so the server creates the sale once.
 * crypto.getRandomValues works on plain-http LAN addresses too, where
 * crypto.randomUUID doesn't exist.
 */
export function newClientSaleId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
