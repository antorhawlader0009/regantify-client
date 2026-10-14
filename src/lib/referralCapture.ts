/**
 * Refer and earn (super-admin-new.md Step 6): a /vendor/signup?ref=CODE link keeps its code for 30 days in this browser, so the new store is
 * tied to its referrer even if the person signs up later. Sent once with the OTP that creates the account. Storage may be blocked: then the
 * code simply only works in the same visit.
 */
const KEY = 'regantify-ref';
const KEEP_MS = 30 * 86_400_000;
let inMemory: string | null = null;

export function captureReferralFromUrl(): void {
  const code = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase();
  if (!code || !/^[A-Z0-9]{4,16}$/.test(code)) return;
  inMemory = code;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // storage blocked: keep it for this visit only
  }
}

export function savedReferralCode(): string | undefined {
  if (inMemory) return inMemory;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { code: string; at: number } | null;
    return saved && Date.now() - saved.at < KEEP_MS ? saved.code : undefined;
  } catch {
    return undefined;
  }
}

export function clearReferralCode(): void {
  inMemory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
