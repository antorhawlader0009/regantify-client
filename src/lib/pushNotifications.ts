import { notificationsApi, type PushTopic } from './notificationsApi';

/**
 * Phone / browser push notifications (Notifications > Alert settings > Phone notifications). The server
 * pushes a bell notification to every device that turned this on (server/src/notifications/push.service.ts),
 * and public/push-sw.js shows it, even with the dashboard closed. Everything here is per device: the browser
 * hands this device its own subscription, the server stores it against the signed-in person.
 */

const SW_URL = '/push-sw.js';

/** Which bell topics a device can ask for, in the order the settings list them. */
export const PUSH_TOPICS: { topic: PushTopic; label: string; hint: string }[] = [
  { topic: 'NEW_ORDER', label: 'New orders', hint: 'Order number, customer and total.' },
  { topic: 'ORDER_ATTENTION', label: 'Problem orders', hint: 'A parcel stuck or late, a failed payment, a possible duplicate.' },
  { topic: 'PLAN_ENDING', label: 'Plan ending', hint: 'A few days before your plan ends.' },
  { topic: 'LOW_STOCK', label: 'Low stock', hint: 'When products go under their limit, at most once a day.' },
  { topic: 'DAILY_SUMMARY', label: 'Daily summary', hint: 'Orders and sales at the end of the day, when the owner has turned it on.' },
];

export type PushSupport =
  /** This browser can receive push. */
  | 'supported'
  /** An iPhone/iPad browser tab: push only works once the dashboard is added to the Home Screen. */
  | 'needs-install'
  | 'unsupported';

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  // iPadOS reports itself as a Mac with a touch screen.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return isIos() ? 'needs-install' : 'unsupported';
  if ('PushManager' in window && 'Notification' in window) return 'supported';
  return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
}

export function pushPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

/** "Chrome on Android", "Safari on iPhone"...: what the device list shows. */
export function describeDevice(): string {
  const ua = navigator.userAgent;
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${browser} on ${os}`;
}

function urlBase64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Registers the push worker (once) and waits until it is running. */
async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  if (registration.active) return registration;
  const worker = registration.installing ?? registration.waiting;
  await new Promise<void>((resolve, reject) => {
    if (!worker) return reject(new Error('The notification service could not start.'));
    const done = () => {
      if (worker.state === 'activated') resolve();
      else if (worker.state === 'redundant') reject(new Error('The notification service could not start.'));
    };
    worker.addEventListener('statechange', done);
    done();
  });
  return registration;
}

/** This device's own subscription, if it has one. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'supported') return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return (await registration?.pushManager.getSubscription()) ?? null;
}

// "This person turned push on for this browser": kept per person, so someone else signing in on a shared
// computer is never subscribed without asking. Used to restore the subscription after a sign-in.
const flagKey = (userId: string) => `regantify.push.${userId}`;

function setFlag(userId: string, on: boolean) {
  try {
    if (on) localStorage.setItem(flagKey(userId), '1');
    else localStorage.removeItem(flagKey(userId));
  } catch {
    // Private mode: it just won't be restored automatically.
  }
}

function hasFlag(userId: string): boolean {
  try {
    return localStorage.getItem(flagKey(userId)) === '1';
  } catch {
    return false;
  }
}

/** Sends the browser's subscription to the server (a new device, or an existing one with fresh topics). */
async function register(subscription: PushSubscription, topics?: PushTopic[]) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error('This browser gave an incomplete notification address.');
  return notificationsApi.pushSubscribe({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    deviceName: describeDevice(),
    ...(topics ? { topics } : {}),
  });
}

/**
 * Turns phone notifications on for this device: asks the browser for permission, subscribes, and tells the
 * server. Throws a message fit to show when it can't (blocked, unsupported, server off).
 */
export async function enablePush(userId: string, topics?: PushTopic[]) {
  if (pushSupport() !== 'supported') throw new Error('This browser can’t receive phone notifications.');
  const config = await notificationsApi.pushConfig();
  if (!config.enabled || !config.publicKey) throw new Error('Phone notifications are not switched on for this server yet.');

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notifications are blocked for this site. Allow them in the browser’s site settings, then try again.');
  }

  const registration = await pushRegistration();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(config.publicKey) }));
  const device = await register(subscription, topics);
  setFlag(userId, true);
  return device;
}

/** Turns it off for this device: the server forgets it and the browser drops the subscription. */
export async function disablePush(userId: string) {
  const subscription = await currentSubscription();
  setFlag(userId, false);
  if (!subscription) return;
  await notificationsApi.pushUnsubscribe(subscription.endpoint).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

/**
 * Called when the dashboard opens: a person who turned push on for this browser gets it re-registered, so it
 * survives the browser rotating its address and a different person signing in on the same computer being
 * moved to their own account. Quietly does nothing for anyone who never turned it on.
 */
export async function syncPush(userId: string) {
  try {
    if (pushSupport() !== 'supported' || pushPermission() !== 'granted' || !hasFlag(userId)) return;
    const config = await notificationsApi.pushConfig();
    if (!config.enabled || !config.publicKey) return;
    const registration = await pushRegistration();
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(config.publicKey) }));
    await register(subscription);
  } catch {
    // Best effort: the bell still works.
  }
}

/**
 * Called on sign-out: this person's phone must stop getting the store's news. The flag stays, so signing
 * back in restores it (syncPush); the server row and the browser subscription go.
 */
export async function pausePushOnSignOut() {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    await notificationsApi.pushUnsubscribe(subscription.endpoint).catch(() => undefined);
  } catch {
    // Signing out must never wait on this.
  }
}
