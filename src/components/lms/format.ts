/** Display helpers shared by the LMS pages. */

/** 01712345678 → "017 1234 5678": easier to read out on a call. */
export function formatPhone(phone: string): string {
  return /^01\d{9}$/.test(phone) ? `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}` : phone;
}

/** The 8801… form a wa.me link needs. */
export function whatsappLink(phone: string): string {
  return `https://wa.me/88${phone}`;
}

export function formatMoney(value: number): string {
  return `৳${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

const MINUTE = 60_000;

/** Minutes since a moment. */
export function minutesSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / MINUTE));
}

/** "just now", "12 min", "3 h", "2 days", then a date. */
export function timeAgo(iso: string, now = Date.now()): string {
  const min = minutesSince(iso, now);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
  return dayMonth(new Date(iso));
}

/** "29 Sep, 3:05 pm" for the timeline. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = dayMonth(d);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  return `${date}, ${time}`;
}

/** timeAgo as a phrase: "just now", "12 min ago", "on 12 Sep". */
export function agoPhrase(iso: string, now = Date.now()): string {
  const ago = timeAgo(iso, now);
  if (ago === 'just now') return ago;
  return minutesSince(iso, now) < 7 * 24 * 60 ? `${ago} ago` : `on ${ago}`;
}

/** "29 Sep": en-GB would write "Sept". */
function dayMonth(d: Date): string {
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
}
