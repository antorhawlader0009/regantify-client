import { useAuthStore } from '../store/authStore';

/*
 * The LMS runs as its own app in its own browser tab (LMS-plan.md Step 4).
 * Every "open the LMS" link goes through here so they all share one tab.
 */

export const LMS_HOME = '/vendor/lms/leads';

/** The LMS tab's window name: a second click finds the same tab instead of opening another. */
export const LMS_WINDOW = 'regantify-lms';

/**
 * Opens the LMS in its tab, or brings the open one to the front.
 * Pass `path` to also move that tab to a page; leave it out to just focus it.
 *
 * An impersonated session can't be carried into a new tab (see
 * `authStore.impersonated`), so there it opens in the same tab.
 * Returns false in that case, so the caller lets its own link navigate.
 */
export function openLms(path?: string): boolean {
  if (useAuthStore.getState().impersonated) return false;

  // window.open('', name) returns the tab with that name if it's open,
  // without reloading it; otherwise a new blank tab.
  const tab = window.open('', LMS_WINDOW);
  if (!tab) {
    // Popup blocked: fall back to this tab.
    window.location.assign(path ?? LMS_HOME);
    return true;
  }

  let isBlank = true;
  try {
    isBlank = tab.location.href === 'about:blank';
  } catch {
    // Not readable (shouldn't happen: same origin). Treat it as new.
  }
  if (isBlank || path) tab.location.href = path ?? LMS_HOME;
  tab.focus();
  return true;
}

