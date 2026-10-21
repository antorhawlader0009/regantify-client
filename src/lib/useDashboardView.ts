import { create } from 'zustand';
import { useAuthStore, type DashboardView } from '../store/authStore';
import { accountApi } from './accountApi';
import { toast } from './toast';

/** Most pages a person can pin to their Simple mode menu (the server keeps the same cap). */
export const MAX_SIMPLE_PINS = 20;

/**
 * In a Super Admin "Login as store" tab the view can be switched to look around, but the owner's saved choice is never
 * changed: the session's own choice lives here, in sessionStorage, for that tab only (SIMPLE-VIEW-plan.md rule 13).
 */
const SESSION_KEY = 'regantify.impersonationView';

interface SessionView {
  view: DashboardView | null;
  pins: string[] | null;
}

function readSession(): SessionView {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw) as SessionView;
  } catch {
    // storage blocked or bad JSON: start from the owner's saved values
  }
  return { view: null, pins: null };
}

const useSessionView = create<SessionView & { set: (next: Partial<SessionView>) => void }>((set, get) => ({
  ...readSession(),
  set: (next) => {
    const merged = { view: get().view, pins: get().pins, ...next };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    } catch {
      // storage blocked: the choice lasts until a reload
    }
    set(merged);
  },
}));

/** Set just before the reload that follows a switch, read once by `takeSwitchedMode` to show the toast. */
const SWITCHED_KEY = 'regantify.modeSwitched';

export function switchedMessage(mode: DashboardView): string {
  return mode === 'SIMPLE'
    ? 'Simple mode is on. Rarely-used pages and options are hidden; everything you set keeps working.'
    : 'Full mode is on. Every page and option is showing.';
}

/** The mode a switch just reloaded the page into, once (null otherwise). */
export function takeSwitchedMode(): DashboardView | null {
  try {
    const v = sessionStorage.getItem(SWITCHED_KEY);
    sessionStorage.removeItem(SWITCHED_KEY);
    return v === 'SIMPLE' || v === 'FULL' ? v : null;
  } catch {
    return null;
  }
}

/** Patch the in-memory signed-in user (the dashboard reads both values from it). */
function patchUser(patch: { dashboardView?: DashboardView; simplePins?: string[] }) {
  const { accessToken, user, setAuth } = useAuthStore.getState();
  if (accessToken && user) setAuth(accessToken, { ...user, ...patch });
}

/**
 * Simple mode / Full mode of the vendor dashboard (SIMPLE-VIEW-plan.md). Simple mode hides rarely-used pages and options
 * from view only; it never locks anything or changes a setting. One choice per person, saved on the server so it follows
 * them to every device; the app never switches it by itself.
 */
export function useDashboardView() {
  const user = useAuthStore((s) => s.user);
  const impersonated = useAuthStore((s) => s.impersonated);
  const session = useSessionView();

  const inDashboard = user?.role === 'VENDOR' || user?.role === 'STAFF';
  // A session saved before the feature has no value: Full mode, which is exactly the old panel.
  const saved: DashboardView = user?.dashboardView ?? 'FULL';
  const view: DashboardView = !inDashboard ? 'FULL' : impersonated && session.view ? session.view : saved;
  const pins: string[] = (impersonated && session.pins) || user?.simplePins || [];

  /** `from` = the page a "Switch to Full mode" note was pressed on (counted for Super Admin, Step 12). */
  const setView = async (next: DashboardView, from?: string) => {
    if (next === view) return;
    if (!impersonated) {
      accountApi.viewStat(next === 'SIMPLE' ? 'TO_SIMPLE' : 'TO_FULL');
      if (from && next === 'FULL') accountApi.viewStat('LEAVE_NOTE', from);
    }
    // "Login as store" lives only in this tab's memory, so a reload would end it: switch in place there.
    if (impersonated) {
      session.set({ view: next });
      toast.info(switchedMessage(next));
      return;
    }
    // Everywhere else the choice is saved first, then the whole page reloads (the user's rule, 2026-10-21), so the
    // dashboard visibly starts again in the new mode; the toast is shown after the reload (SwitchedToast).
    try {
      await accountApi.setDashboardView(next);
    } catch {
      toast.error('Could not switch the mode. Please try again.');
      return;
    }
    try {
      sessionStorage.setItem(SWITCHED_KEY, next);
    } catch {
      // storage blocked: the page still reloads, just without the toast
    }
    window.location.reload();
  };

  const savePins = async (next: string[]) => {
    if (impersonated) {
      session.set({ pins: next });
      return;
    }
    const before = user?.simplePins ?? [];
    patchUser({ simplePins: next });
    try {
      const res = await accountApi.setSimplePins(next);
      patchUser({ simplePins: res.simplePins });
    } catch {
      patchUser({ simplePins: before });
      toast.error('Could not save your menu. Please try again.');
    }
  };

  /** Add a page to the Simple mode menu, or take it off. */
  const togglePin = (path: string) => {
    if (pins.includes(path)) return savePins(pins.filter((p) => p !== path));
    if (pins.length >= MAX_SIMPLE_PINS) {
      toast.error(`Your menu can hold ${MAX_SIMPLE_PINS} added pages. Remove one first.`);
      return Promise.resolve();
    }
    toast.success('Added to your menu.');
    if (!impersonated) accountApi.viewStat('PIN', path);
    return savePins([...pins, path]);
  };

  return { view, isSimple: view === 'SIMPLE', setView, pins, togglePin, inDashboard };
}
