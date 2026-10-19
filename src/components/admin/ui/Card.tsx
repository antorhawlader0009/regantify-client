import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RowMenu, type RowMenuItem } from '../RowMenu';

/**
 * The Super Admin panel's card (admin-panel-new-theme.md Step 3): white, 20px corners, no border, a soft shadow.
 * `flush` drops the inner padding for a card whose body is a table or a list that draws its own edges.
 */
export function Card({ children, className = '', flush = false }: { children: ReactNode; className?: string; flush?: boolean }) {
  return <section className={`rounded-2xl bg-white shadow-[var(--console-card-shadow)] ${flush ? '' : 'p-5 sm:p-6'} ${className}`}>{children}</section>;
}

/**
 * A card's title row: title and an optional subtitle on the left; on the right an optional control (a RangeTabs, a select),
 * an optional "View all" link and an optional kebab menu.
 */
export function CardHeader({
  title,
  subtitle,
  action,
  to,
  toLabel = 'View all',
  menu,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  to?: string;
  toLabel?: string;
  menu?: RowMenuItem[];
  className?: string;
}) {
  return (
    <div className={`mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-snug text-regantify-text">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-regantify-text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {to && (
          <Link to={to} className="text-[13px] font-medium text-regantify-cta hover:underline">
            {toLabel}
          </Link>
        )}
        {menu && menu.length > 0 && <RowMenu items={menu} />}
      </div>
    </div>
  );
}
