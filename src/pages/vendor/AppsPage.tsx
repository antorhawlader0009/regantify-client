import { Smartphone, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageKit';

/*
 * Main Menu > App (2026-10-23): the two mobile apps Regantify is planning. Neither is built yet, so the page only says
 * what each will do and that it is coming. Nothing here is a promise of a date.
 */

interface PlannedApp {
  icon: LucideIcon;
  title: string;
  who: string;
  points: string[];
}

const APPS: PlannedApp[] = [
  {
    icon: Smartphone,
    title: 'Regantify app for you',
    who: 'For you and your team',
    points: ['Get new orders and confirm them from your phone', 'Check stock, sales and payments on the go', 'Reply to customers and send order updates'],
  },
  {
    icon: Store,
    title: 'An app for your store',
    who: 'For your customers',
    points: ['Your own shop app with your name and logo', 'Customers browse and order from their phone', 'Order updates and offers sent straight to them'],
  },
];

export default function AppsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader title="App" description="Mobile apps for you and for your store." />
      <div className="grid gap-4 md:grid-cols-2">
        {APPS.map((app) => (
          <section key={app.title} className="flex flex-col rounded-xl border border-line bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                <app.icon size={20} strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold text-regantify-text">{app.title}</h2>
                <p className="text-xs text-neutral-500">{app.who}</p>
              </div>
              <span className="shrink-0 rounded-full border border-line bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-600">Coming soon</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              {app.points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" aria-hidden />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-4 text-xs text-neutral-500">We are building it. You will see it here as soon as it is ready.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
