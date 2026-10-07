import type { NotificationType, VendorNotification } from './notificationsApi';

/**
 * Notifications > Alert settings, the "On this device" part: a sound for new
 * orders and the browser's desktop pop-up. Kept per device in localStorage
 * (the counter PC rings, the owner's laptop may not), and the browser's own
 * pop-up permission is per device anyway. The SMS part is the store's, on
 * the server (notificationsApi.getSettings).
 */
export interface DeviceAlertPrefs {
  /** Chime when a new order or a problem order comes in. */
  sound: boolean;
  /** Desktop pop-up, for the kinds in `types`. */
  desktop: boolean;
  types: NotificationType[];
}

const PREFS_KEY = 'regantify.notificationAlerts';
/** Newest notification already alerted on, shared by every open tab so a new order rings once, not once per tab. */
const ALERTED_KEY = 'regantify.notificationAlerts.lastAt';

export const ALL_ALERT_TYPES: NotificationType[] = ['ORDER', 'REVIEW', 'WITHDRAW', 'WALLET', 'SUBSCRIPTION', 'STOCK', 'SUPPORT', 'SYSTEM'];
const DEFAULT_PREFS: DeviceAlertPrefs = { sound: true, desktop: false, types: ALL_ALERT_TYPES };

export function readAlertPrefs(): DeviceAlertPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const saved = JSON.parse(raw) as Partial<DeviceAlertPrefs>;
    return {
      sound: saved.sound ?? DEFAULT_PREFS.sound,
      desktop: saved.desktop ?? DEFAULT_PREFS.desktop,
      types: Array.isArray(saved.types) ? saved.types.filter((t) => ALL_ALERT_TYPES.includes(t)) : DEFAULT_PREFS.types,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveAlertPrefs(prefs: DeviceAlertPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private window or blocked storage: the settings just last for this visit.
  }
}

export function desktopPermission(): NotificationPermission | 'unsupported' {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

/**
 * The notifications this tab should alert on: newer than the newest one any
 * tab has already alerted on. The first look on a device only sets the mark,
 * so opening the dashboard never rings for old ones.
 */
export function takeNewForAlert(items: VendorNotification[]): VendorNotification[] {
  const newest = items.reduce((max, i) => (i.createdAt > max ? i.createdAt : max), '');
  let mark: string | null = null;
  try {
    mark = localStorage.getItem(ALERTED_KEY);
  } catch {
    return [];
  }
  if (!mark) {
    try {
      localStorage.setItem(ALERTED_KEY, newest || new Date().toISOString());
    } catch {
      // ignore
    }
    return [];
  }
  const fresh = items.filter((i) => !i.readAt && i.createdAt > mark!);
  if (fresh.length && newest > mark) {
    try {
      localStorage.setItem(ALERTED_KEY, newest);
    } catch {
      // ignore
    }
  }
  return fresh;
}

/** A short two-note chime, made in the browser (no sound file to load). */
export function playChime(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    // The browser blocked audio (no click on the page yet): the bell still shows it.
  }
}

/** Rings and pops up for the fresh notifications, as this device's settings say. */
export function alertFor(fresh: VendorNotification[], onOpen: (item: VendorNotification) => void): void {
  if (!fresh.length) return;
  const prefs = readAlertPrefs();
  if (prefs.sound && fresh.some((i) => i.topic === 'NEW_ORDER' || i.topic === 'ORDER_ATTENTION')) playChime();
  if (!prefs.desktop || desktopPermission() !== 'granted') return;
  const shown = fresh.filter((i) => prefs.types.includes(i.type));
  // A burst (a bulk import, many orders at once) becomes one pop-up, not a wall of them.
  if (shown.length > 3) {
    const n = new Notification(`${shown.length} new notifications`, { body: shown.slice(0, 3).map((i) => i.title).join('\n'), tag: 'regantify-batch' });
    n.onclick = () => {
      window.focus();
      onOpen({ ...shown[0], link: '/vendor/notifications' });
      n.close();
    };
    return;
  }
  for (const item of shown) {
    const n = new Notification(item.title, { body: item.body ?? undefined, tag: item.id });
    n.onclick = () => {
      window.focus();
      onOpen(item);
      n.close();
    };
  }
}
