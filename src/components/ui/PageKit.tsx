import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Search, type LucideIcon } from 'lucide-react';

// Page building blocks of the dashboard theme (theme-update-plan.md
// Step 1): the patterns All Products / Orders / Customers settled on,
// in one place so every other page reuses them instead of copying.

// ---------------------------------------------------------------- classes

/** Main action: dark green. */
export const primaryBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-sm text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60';

/** Second action next to the main one (import, upload): blue. */
export const secondaryBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60';

/** Everything else: white with a hairline. */
export const outlineBtn =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';

/** A small square icon button, e.g. the row's ⋮ actions. */
export const iconBtn =
  'inline-flex items-center justify-center rounded-md border border-line bg-white p-1.5 text-regantify-text transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50';

/** Table header / body cells: the hairline grid. */
export const th = 'border-r border-line px-3 py-3 text-left font-normal last:border-r-0';
export const td = 'border-r border-line p-3 last:border-r-0';
/** A table row; selected rows get the lime tint. */
export const trClass = (selected = false) =>
  `border-t border-line align-top text-regantify-text transition-colors ${selected ? 'bg-brand-lime/20' : 'hover:bg-neutral-50/70'}`;
/** The header row. */
export const theadRow = 'bg-neutral-50 text-neutral-600';
/** Checkbox inside a table. */
export const tableCheckbox = 'h-4 w-4 cursor-pointer accent-brand';

// ---------------------------------------------------------------- layout

/** The white page block on the grey background. One per page, unless the content is really separate. */
export function PageSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white p-3.5 ${className}`}>{children}</section>;
}

/**
 * Page title row: title + a short help line on the left, actions on the
 * right. Wraps on phones. Goes inside a PageSection (as its first child)
 * or on its own above one.
 */
export function PageHeader({
  title,
  description,
  actions,
  className = 'mb-3',
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="mr-auto min-w-0">
        <h1 className="text-[15px] font-semibold text-regantify-text">{title}</h1>
        {description && <div className="mt-0.5 text-xs text-neutral-500">{description}</div>}
      </div>
      {actions}
    </div>
  );
}

/** The search field of a toolbar. */
export function SearchBox({
  value,
  onChange,
  placeholder = 'Search',
  className = 'sm:w-[215px]',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm focus-within:border-brand ${className}`}>
      <Search size={15} className="shrink-0" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent text-regantify-text outline-none placeholder:text-neutral-500"
      />
    </div>
  );
}

/** A native select styled as a toolbar button (keeps the phone's own picker). */
export function SelectBox({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} className={`${outlineBtn} appearance-none pr-8`}>
        {children}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" aria-hidden />
    </div>
  );
}

/** Tabs inside a page: the lime pill bar (Orders / Settings). */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  trailing,
  className = 'mb-3',
}: {
  tabs: { id: T; label: ReactNode; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  /** Right-aligned extra (e.g. a settings button). */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-white p-1 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm transition-colors ${
            value === t.id ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {t.label}
          {t.count != null && <span className="text-xs tabular-nums text-neutral-500">{t.count.toLocaleString()}</span>}
        </button>
      ))}
      {trailing && <div className="ml-auto flex shrink-0 items-center">{trailing}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- tables

/** The hairline-bordered, horizontally scrollable table frame. */
export function TableFrame({ children, minWidth = 'min-w-[900px]', className = '' }: { children: ReactNode; minWidth?: string; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-line ${className}`}>
      <table className={`w-full ${minWidth} border-collapse text-[14px]`}>{children}</table>
    </div>
  );
}

/** Skeleton rows while a table loads. */
export function TableSkeleton({ rows, colSpan, height = 'h-8' }: { rows: number; colSpan: number; height?: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-t border-line">
          <td colSpan={colSpan} className="p-3">
            <div className={`${height} w-full animate-pulse rounded-md bg-neutral-100`} />
          </td>
        </tr>
      ))}
    </>
  );
}

/** Page numbers around the current page (at most 5). */
export function pageWindow(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
}

/**
 * Under a table: "Show [10] per page" on the left, "1-10 of N ← 1 2 →" on
 * the right. Leave out `onPerPageChange` for a list with a fixed page size.
 */
export function TableFooter({
  page,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 25, 50, 100],
}: {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="mt-4 flex flex-col gap-3 px-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
      {onPerPageChange ? (
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          Show
          <div className="relative">
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-xs text-regantify-text outline-none focus:border-brand"
            >
              {perPageOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" aria-hidden />
          </div>
          <span className="text-xs">per page</span>
        </div>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="mr-2 text-xs text-neutral-600">
          {from}-{to} of {total.toLocaleString()}
        </span>
        {totalPages > 1 && (
          <>
            <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous page" className="disabled:opacity-30">
              <ArrowLeft size={16} />
            </button>
            {pageWindow(page, totalPages).map((n) => (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`h-8 min-w-8 rounded-md px-1 ${n === page ? 'bg-neutral-100 font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-50'}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
              className="disabled:opacity-30"
            >
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- states

/**
 * Nothing to show yet. Says what's missing and offers the next step,
 * never just "No data". Use `as="row"` inside a table body.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  as = 'div',
  colSpan,
}: {
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  /** The next step, e.g. an "Add coupon" button. */
  action?: ReactNode;
  as?: 'div' | 'row';
  colSpan?: number;
}) {
  const body = (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        <Icon size={20} aria-hidden />
      </div>
      <p className="mt-2 text-sm font-medium text-regantify-text">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-neutral-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
  if (as === 'row') {
    return (
      <tr className="border-t border-line">
        <td colSpan={colSpan}>{body}</td>
      </tr>
    );
  }
  return body;
}

/**
 * Phones: a table's rows as a stacked list (each child is one row). Show
 * it with `md:hidden` and the table with `hidden md:block`.
 */
export function StackedList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <ul className={`divide-y divide-line overflow-hidden rounded-lg border border-line ${className}`}>{children}</ul>;
}
