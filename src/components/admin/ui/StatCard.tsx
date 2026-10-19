import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { Compared } from '../../../lib/analyticsApi';
import { changeOf, type ValueKind } from '../charts/theme';

export type StatTone = 'orange' | 'purple' | 'cyan' | 'green' | 'rose';

const CHIP: Record<StatTone, string> = {
  orange: 'bg-[var(--tint-orange-bg)] text-regantify-cta',
  purple: 'bg-[var(--tint-purple-bg)] text-[var(--tint-purple-fg)]',
  cyan: 'bg-[var(--tint-cyan-bg)] text-[var(--tint-cyan-fg)]',
  green: 'bg-[var(--tint-green-bg)] text-[var(--tint-green-fg)]',
  rose: 'bg-[var(--tint-rose-bg)] text-[var(--tint-rose-fg)]',
};

/** "+12.5%" with an arrow: green when good, red when bad (`badWhenUp` flips it, e.g. for costs). Nothing when there is no earlier number. */
export function ChangeTag({ value, kind = 'count', badWhenUp = false }: { value: Compared; kind?: ValueKind; badWhenUp?: boolean }) {
  const c = changeOf(value, kind);
  if (!c || c.value === 0) return null;
  const up = c.value > 0;
  const good = badWhenUp ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold ${good ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      <Icon size={13} aria-hidden />
      {c.label}
    </span>
  );
}

/**
 * A KPI tile (admin-panel-new-theme.md Step 3): an icon in a soft round chip, the label, the big value, the change against the period before and
 * an optional small chart (a Sparkline from the chart kit) at the bottom. With `to` the whole tile is a link to the page behind the number.
 */
export function StatCard({
  label,
  value,
  icon,
  tone = 'orange',
  change,
  kind,
  badWhenUp,
  hint,
  chart,
  to,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: StatTone;
  change?: Compared;
  kind?: ValueKind;
  badWhenUp?: boolean;
  hint?: ReactNode;
  chart?: ReactNode;
  to?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13.5px] font-medium text-regantify-text-muted">{label}</p>
        {icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${CHIP[tone]} [&>svg]:h-[18px] [&>svg]:w-[18px]`}>{icon}</span>}
      </div>
      <p className="dash-money mt-1 text-[26px] font-semibold leading-tight tracking-tight text-regantify-text tabular-nums">{value}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-regantify-text-muted">
        {change && <ChangeTag value={change} kind={kind} badWhenUp={badWhenUp} />}
        {hint && <span>{hint}</span>}
      </div>
      {chart && <div className="mt-3">{chart}</div>}
    </>
  );
  const cls = 'block rounded-2xl bg-white p-5 shadow-[var(--console-card-shadow)]';
  return to ? (
    <Link to={to} className={`${cls} focus-visible:outline-offset-2`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
