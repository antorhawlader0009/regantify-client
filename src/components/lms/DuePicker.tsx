import { LmsInput } from './ui';

/*
 * "When?" for callbacks and follow-ups: quick picks (in 1 hour, this
 * evening, tomorrow morning) or any time. Values are local
 * "YYYY-MM-DDTHH:mm" strings, the datetime-local input's own format.
 */

export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function quickTimes(now = new Date()): { label: string; at: Date }[] {
  const inHour = new Date(now.getTime() + 60 * 60_000);
  const evening = new Date(now);
  evening.setHours(19, 0, 0, 0);
  const morning = new Date(now);
  morning.setDate(morning.getDate() + 1);
  morning.setHours(10, 0, 0, 0);
  const times = [{ label: 'In 1 hour', at: inHour }];
  if (evening.getTime() - now.getTime() > 90 * 60_000) times.push({ label: 'This evening, 7 pm', at: evening });
  times.push({ label: 'Tomorrow, 10 am', at: morning });
  return times;
}

export function DuePicker({
  label,
  value,
  onChange,
  pickedClass = 'border-lms-ink bg-lms-ink text-white',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Colour of a picked chip (the Call Desk uses the In talks colour). */
  pickedClass?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {quickTimes().map((t) => {
          const v = toLocalInput(t.at);
          return (
            <button
              key={t.label}
              type="button"
              aria-pressed={value === v}
              onClick={() => onChange(v)}
              className={`h-9 rounded-md border px-3 text-sm ${value === v ? pickedClass : 'border-lms-line bg-lms-surface hover:bg-lms-page'}`}
            >
              {t.label}
            </button>
          );
        })}
        <LmsInput
          type="datetime-local"
          aria-label="Pick a time"
          value={value}
          min={toLocalInput(new Date())}
          onChange={(e) => onChange(e.target.value)}
          className="!w-auto tabular-nums"
        />
      </div>
    </div>
  );
}

/** Reminder days for "Not now". */
export function RemindPicker({ days, onChange, options }: { days: number | null; onChange: (d: number | null) => void; options: number[] }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">Remind me to call again in</p>
      <div className="flex flex-wrap gap-2">
        {options.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days === d}
            onClick={() => onChange(days === d ? null : d)}
            className={`h-9 rounded-md border px-3 text-sm tabular-nums ${
              days === d ? 'border-lms-stage-talks bg-lms-stage-talks text-white' : 'border-lms-line bg-lms-surface hover:bg-lms-page'
            }`}
          >
            {d} days
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-lms-muted">
        {days ? `The lead reopens by itself in ${days} days and shows up as a call to make.` : "Pick one, or leave it and the lead stays closed."}
      </p>
    </div>
  );
}
