import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Compared, NullableCompared } from '../../lib/analyticsApi';
import { changeOf, formatValue, type ValueKind } from './format';

/** Categorical slot 1 of the dataviz reference palette (see TrendChart). */
export const SERIES_1 = '#2a78d6';

/** A titled content block. Border only: the page is white, so a hairline is enough to separate. */
export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white rounded-xl border border-line p-5 ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 mb-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>}
            {subtitle && <p className="text-[13px] text-neutral-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STRIP_COLS: Record<2 | 3 | 4 | 5, string> = {
  2: '', // the base grid is already two wide (Sales without profit for a staff role, rule-plan.md Step 10)
  3: 'sm:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

/**
 * A tab's headline numbers as one joined strip, cells split by hairlines,
 * so they read as one set rather than a row of separate cards. On two
 * columns an odd last cell spans the row, so no empty gap shows.
 */
export function KpiStrip({ cols, children }: { cols: 2 | 3 | 4 | 5; children: ReactNode }) {
  return (
    <div
      className={`grid grid-cols-2 ${STRIP_COLS[cols]} gap-px overflow-hidden rounded-xl border border-line bg-line
        [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1`}
    >
      {children}
    </div>
  );
}

/**
 * The change next to a number: arrow + signed text, so it never relies
 * on color alone. `lowerIsBetter` flips which way is good (a falling
 * cancel rate is good news).
 */
export function ChangeBadge({ value, kind, lowerIsBetter }: { value: Compared | NullableCompared; kind: ValueKind; lowerIsBetter?: boolean }) {
  const { current, previous } = value;
  const change = current != null && previous != null ? changeOf({ current, previous }, kind) : null;
  const quiet = 'text-[12px] font-medium text-neutral-500';
  if (!change) {
    const isNew = current != null && (previous == null || current > 0);
    return <span className={quiet}>{isNew ? 'New' : 'No data'}</span>;
  }
  if (Math.abs(change.value) < 0.05) return <span className={quiet}>No change</span>;
  const up = change.value > 0;
  const good = up !== Boolean(lowerIsBetter);
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums ${good ? 'text-emerald-700' : 'text-red-700'}`}>
      <Arrow size={13} strokeWidth={2.4} aria-hidden />
      {change.label}
    </span>
  );
}

function Cell({ label, aside, value, hint }: { label: string; aside?: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="bg-white px-5 py-4 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] text-neutral-500 truncate">{label}</p>
        {aside}
      </div>
      <p className="mt-1.5 text-[28px] leading-none font-semibold tracking-tight text-regantify-text tabular-nums truncate">{value}</p>
      {hint && <p className="mt-2 text-[12px] text-neutral-500 truncate">{hint}</p>}
    </div>
  );
}

/** A headline number with its change from the previous period. Goes inside a KpiStrip. */
export function KpiCard({
  label,
  value,
  kind,
  hint,
  lowerIsBetter,
  compareLabel,
}: {
  label: string;
  /** A null current value (e.g. a rate with nothing to divide) shows as "—". */
  value: Compared | NullableCompared;
  kind: ValueKind;
  hint?: string;
  lowerIsBetter?: boolean;
  compareLabel: string;
}) {
  const previousText = value.previous == null ? 'No data' : formatValue(value.previous, kind);
  return (
    <Cell
      label={label}
      aside={<ChangeBadge value={value} kind={kind} lowerIsBetter={lowerIsBetter} />}
      value={value.current == null ? '—' : formatValue(value.current, kind)}
      hint={hint ?? `${previousText} ${compareLabel.replace(/^vs /, 'in the ')}`}
    />
  );
}

/** A number with no previous-period comparison (a "right now" figure). Goes inside a KpiStrip. */
export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return <Cell label={label} value={value} hint={hint} />;
}

export interface BarListRow {
  key: string;
  label: ReactNode;
  value: number;
  /** Shown instead of the plain value, e.g. "৳12,950 (72%)". */
  display?: ReactNode;
}

/**
 * A ranked list with a soft bar behind each row sized to its share of
 * the biggest one; reads faster than a chart for "which is biggest".
 * The number is always printed, so the bar is never the only signal.
 */
export function BarList({ rows, emptyText, valueHeader, labelHeader }: { rows: BarListRow[]; emptyText: string; valueHeader?: string; labelHeader?: string }) {
  if (rows.length === 0) return <EmptyState text={emptyText} />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div>
      {(labelHeader || valueHeader) && (
        <div className="flex justify-between px-3 pb-2 text-[12px] text-neutral-500">
          <span>{labelHeader}</span>
          <span>{valueHeader}</span>
        </div>
      )}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.key} className="relative flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
            <span
              className="absolute inset-y-0 left-0 rounded-lg"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: SERIES_1, opacity: 0.1 }}
              aria-hidden
            />
            <span className="relative min-w-0 truncate text-regantify-text">{r.label}</span>
            <span className="relative shrink-0 tabular-nums font-medium text-regantify-text">{r.display ?? r.value.toLocaleString('en-US')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A share shown next to a number, e.g. "13 (30%)". */
export function Share({ pct }: { pct: number }) {
  return <span className="ml-1 text-xs font-normal text-neutral-500">({pct.toFixed(0)}%)</span>;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500 py-8 text-center">{text}</p>;
}

/** Toggle for a chart's metric (e.g. Sales / Orders). */
export function Segmented<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`h-8 rounded-md px-3 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            value === o.id ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A plain text link in a card header. No arrow: the words say where it goes. */
export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-[13px] font-medium text-regantify-text underline decoration-neutral-300 underline-offset-4 hover:decoration-regantify-text whitespace-nowrap">
      {children}
    </Link>
  );
}

export function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-label="Loading">
      <div className="h-[118px] rounded-xl bg-neutral-100" />
      <div className="h-80 rounded-xl bg-neutral-100" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-neutral-100" />
        <div className="h-64 rounded-xl bg-neutral-100" />
      </div>
    </div>
  );
}

export function ProductThumb({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    <img src={src} alt={alt} className="h-10 w-10 shrink-0 rounded-lg object-cover border border-line" loading="lazy" />
  ) : (
    <span className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100" aria-hidden />
  );
}

export interface MobileRow {
  key: string;
  title: ReactNode;
  sub?: ReactNode;
  /** The headline number, right-aligned. */
  value: ReactNode;
  /** The other columns, as one short line. */
  detail?: ReactNode;
  to?: string;
}

/**
 * Phones: a report table's rows as a stacked list (show it with
 * `md:hidden`, the table with `hidden md:block`).
 */
export function MobileRows({ rows }: { rows: MobileRow[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line md:hidden">
      {rows.map((r) => {
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-regantify-text">{r.title}</p>
              {r.sub && <p className="truncate text-xs text-neutral-500">{r.sub}</p>}
              {r.detail && <p className="mt-0.5 text-xs text-neutral-600">{r.detail}</p>}
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-regantify-text">{r.value}</span>
          </>
        );
        return (
          <li key={r.key}>
            {r.to ? (
              <Link to={r.to} className="flex items-start gap-3 px-3 py-2.5 active:bg-neutral-50">
                {body}
              </Link>
            ) : (
              <div className="flex items-start gap-3 px-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
