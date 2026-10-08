// Date-and-time fields in Dhaka time, whatever the browser's own time zone is (a phone set to another zone, a
// laptop abroad): the store's day runs on Bangladesh time. An <input type="datetime-local"> holds "YYYY-MM-DDTHH:mm"
// with no zone, so these turn that into the exact instant (and back) using the fixed +06:00 offset
// (Bangladesh has no daylight saving).

const DHAKA_OFFSET_MS = 6 * 3_600_000;

/** An instant (ISO string) as the "YYYY-MM-DDTHH:mm" a datetime-local input shows, in Dhaka time. '' for none. */
export function isoToDhakaInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  return new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 16);
}

/** What a datetime-local input holds (Dhaka time) as an ISO instant, or null when empty or not a date. */
export function dhakaInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00+06:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** The earliest value a "from now on" field should accept: the next minute, in Dhaka time. */
export function nowDhakaInput(): string {
  return isoToDhakaInput(new Date(Date.now() + 60_000).toISOString());
}
