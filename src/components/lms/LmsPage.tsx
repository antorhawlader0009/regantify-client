import { useEffect, type ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { LmsMe } from '../../lib/lmsApi';

/**
 * One LMS page inside the app shell (LmsLayout): the title row and the
 * page's content. The shell has already checked the plan and that the LMS
 * is on, and passes `me` down through the outlet context.
 */
export function LmsPage({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: (me: LmsMe) => ReactNode;
}) {
  const me = useOutletContext<LmsMe>();

  useEffect(() => {
    document.title = me.storeName ? `${title} | LMS | ${me.storeName}` : `${title} | LMS`;
  }, [title, me.storeName]);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children(me)}
    </>
  );
}

/** A white surface for page content. */
export function Panel({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-[10px] border border-lms-line bg-lms-surface p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

/** The empty state inside a panel: what's missing and what fills it. */
export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-10 sm:py-14 max-w-md">
      <p className="text-base font-medium">{title}</p>
      <p className="mt-1 text-sm text-lms-muted">{text}</p>
    </div>
  );
}
