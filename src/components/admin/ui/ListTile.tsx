import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { StatTone } from './StatCard';

const CHIP: Record<StatTone | 'red' | 'neutral', string> = {
  orange: 'bg-[var(--tint-orange-bg)] text-regantify-cta',
  purple: 'bg-[var(--tint-purple-bg)] text-[var(--tint-purple-fg)]',
  cyan: 'bg-[var(--tint-cyan-bg)] text-[var(--tint-cyan-fg)]',
  green: 'bg-[var(--tint-green-bg)] text-[var(--tint-green-fg)]',
  rose: 'bg-[var(--tint-rose-bg)] text-[var(--tint-rose-fg)]',
  red: 'bg-red-50 text-red-700',
  neutral: 'bg-white text-regantify-text-muted',
};

/**
 * A soft row inside a card (admin-panel-new-theme.md Step 3): an icon in a round chip, a title and a subtitle, something on the right and a chevron
 * when it leads somewhere. `tone="red"` is for something that needs attention (problems are red, never amber).
 */
export function ListTile({
  title,
  subtitle,
  icon,
  tone = 'orange',
  trailing,
  to,
  onClick,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  tone?: StatTone | 'red' | 'neutral';
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      {icon && <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${CHIP[tone]} [&>svg]:h-[18px] [&>svg]:w-[18px]`}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[14px] font-medium leading-snug text-regantify-text">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[12.5px] text-regantify-text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-[13px] text-regantify-text">{trailing}</span>}
      {(to || onClick) && <ChevronRight size={17} className="shrink-0 text-regantify-text-muted" aria-hidden />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-[14px] border border-[var(--console-tile-line)] bg-[var(--console-tile)] px-3.5 py-3 text-left';
  if (to) return <Link to={to} className={`${cls} transition hover:border-[var(--console-tile-line-strong)] hover:bg-white`}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} transition hover:border-[var(--console-tile-line-strong)] hover:bg-white`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}
