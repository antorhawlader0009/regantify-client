// One date format across the vendor panel (theme-update-plan.md): "27 Sept,
// 4:06 PM", Dhaka time. The year is added only when it isn't this year.

const TZ = 'Asia/Dhaka';

function dhakaYear(d: Date) {
  return d.toLocaleDateString('en-GB', { year: 'numeric', timeZone: TZ });
}

/** "27 Sept" or "27 Sept 2025". */
export function formatDhakaDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = dhakaYear(d) === dhakaYear(new Date());
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }), timeZone: TZ });
}

/** "27 Sept, 4:06 PM" or "27 Sept 2025, 4:06 PM". */
export function formatDhakaDateTime(iso: string): string {
  const time = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
  return `${formatDhakaDate(iso)}, ${time}`;
}
