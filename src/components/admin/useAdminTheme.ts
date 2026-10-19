import { useEffect, useSyncExternalStore } from 'react';

/**
 * Light or dark for the Super Admin panel only (admin-panel-new-theme.md Step 11). Saved per browser; light by default.
 * The choice is put on <body> as data-admin-theme while an admin screen is mounted and taken off when it unmounts, the same way as the
 * admin-panel class, so the vendor panel, LMS, POS and marketing site can never end up dark.
 */
export type AdminTheme = 'light' | 'dark';

const KEY = 'regantify.adminTheme';
const ATTR = 'data-admin-theme';
const listeners = new Set<() => void>();

function read(): AdminTheme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

let current: AdminTheme = read();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setAdminTheme(next: AdminTheme) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // storage blocked: the choice lasts until the tab closes
  }
  if (document.body.classList.contains('admin-panel')) document.body.setAttribute(ATTR, next);
  listeners.forEach((fn) => fn());
}

/** The current theme and a setter, for the top-bar switch. */
export function useAdminTheme(): [AdminTheme, (t: AdminTheme) => void] {
  const theme = useSyncExternalStore(subscribe, () => current, () => 'light' as AdminTheme);
  return [theme, setAdminTheme];
}

/** Put the saved theme on <body> while this admin screen is open; take it off on the way out. Called by AdminLayout and ConsoleAuthShell. */
export function useApplyAdminTheme() {
  const [theme] = useAdminTheme();
  useEffect(() => {
    document.body.setAttribute(ATTR, theme);
  }, [theme]);
  useEffect(() => () => document.body.removeAttribute(ATTR), []);
}
