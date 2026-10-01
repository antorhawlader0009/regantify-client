import { type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

export function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle size={14} className="text-neutral-400 cursor-help" />
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block
          w-max max-w-[220px] bg-neutral-900 text-white text-xs rounded-md px-2.5 py-1.5 z-10"
      >
        {text}
      </span>
    </span>
  );
}

/** A form section in the dashboard theme: hairline card, 15px title, optional one-line help and a right-side action. */
export function SectionCard({
  title,
  children,
  id,
  description,
  action,
}: {
  title: string;
  children: ReactNode;
  id?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A labelled field. Required fields get a red asterisk; the field only
 * turns red when there's an actual problem (`error`), so a fresh form
 * doesn't look full of mistakes.
 */
export function Field({
  label,
  required,
  tooltip,
  children,
  hint,
  error,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-regantify-text">
        {label}
        {required && (
          <span className="text-red-500" aria-hidden>
            *
          </span>
        )}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <div className={error ? '[&_input]:border-red-400 [&_select]:border-red-400 [&_textarea]:border-red-400' : undefined}>{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <div className="mt-1.5 text-xs text-neutral-500">{hint}</div>
      )}
    </div>
  );
}

/** Text inputs, selects and textareas on every product form: white with a hairline, green focus ring. */
export const productInputClass =
  'w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-regantify-text outline-none transition placeholder:text-neutral-400 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

/** Same look; kept as its own name because other forms import it. */
export const inputClass = productInputClass;
