import { Field } from './ProductFormPieces';

export const MAX_BADGE_LENGTH = 15;

const inputClass =
  'h-10 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15';

/** The end of a Dhaka day as an instant, for the server ("2026-10-20" -> the end of that day at +06:00). */
export const badgeUntilIso = (date: string) => (date ? `${date}T23:59:59+06:00` : null);

/** An instant from the server as the Dhaka day it falls on, for the date box. */
export const badgeUntilDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) : '');

/**
 * Add / Edit Product: "Badge" (TellMe idea 37). A short word on the product's card and page on a StorePal store ("New",
 * "Hot", "Eid offer", at most 15 letters), in the one colour set in Store > Design > Product Card. An optional day takes it
 * off by itself ("New" for two weeks). Empty = no badge.
 */
export function BadgeField({
  text,
  until,
  onChange,
}: {
  text: string;
  /** YYYY-MM-DD in Dhaka time, or ''. */
  until: string;
  onChange: (next: { text: string; until: string }) => void;
}) {
  return (
    <Field label="Badge" hint="A short word on the product card and page, like “New” or “Hot”. StorePal stores only.">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => onChange({ text: e.target.value.slice(0, MAX_BADGE_LENGTH), until: e.target.value ? until : '' })}
          maxLength={MAX_BADGE_LENGTH}
          placeholder="e.g. New"
          aria-label="Badge"
          className={`${inputClass} w-44`}
        />
        {text.trim() && (
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            Remove on
            <input type="date" value={until} onChange={(e) => onChange({ text, until: e.target.value })} aria-label="Remove the badge on" className={inputClass} />
            <span className="text-xs text-neutral-500">(optional)</span>
          </label>
        )}
      </div>
    </Field>
  );
}
