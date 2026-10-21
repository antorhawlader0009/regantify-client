import { Check, LayoutGrid, Rows3 } from 'lucide-react';
import { useDashboardView } from '../lib/useDashboardView';
import type { DashboardView } from '../store/authStore';
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from './ui/DropdownMenu';

const OPTIONS: { view: DashboardView; label: string; hint: string; icon: typeof Rows3 }[] = [
  { view: 'SIMPLE', label: 'Simple view', hint: 'Only what you need every day', icon: Rows3 },
  { view: 'FULL', label: 'Full view', hint: 'Every page and option', icon: LayoutGrid },
];

/**
 * The top-bar pill that always shows which view the dashboard is in (SIMPLE-VIEW-plan.md rule 5) and switches it.
 * Icon only on a phone. Switching hides or shows things; it never changes a setting.
 */
export function ViewSwitch() {
  const { view, setView, inDashboard } = useDashboardView();
  if (!inDashboard) return null;
  const current = OPTIONS.find((o) => o.view === view) ?? OPTIONS[1];
  const Icon = current.icon;
  return (
    <DropdownMenu
      widthClass="w-64"
      trigger={
        <button
          type="button"
          title={`${current.label}: click to switch`}
          aria-label={`${current.label}. Switch view`}
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm active:scale-95 sm:w-auto sm:px-4"
        >
          <Icon size={15} className="text-neutral-600" />
          <span className="hidden sm:inline">{current.label}</span>
        </button>
      }
    >
      <DropdownMenuLabel>Dashboard view</DropdownMenuLabel>
      {OPTIONS.map((o) => {
        const ItemIcon = o.icon;
        return (
          <DropdownMenuItem
            key={o.view}
            onSelect={() => setView(o.view)}
            icon={<span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-600"><ItemIcon size={16} /></span>}
            hint={o.hint}
            badge={o.view === view ? <Check size={16} className="ml-auto shrink-0 text-brand" /> : undefined}
          >
            {o.label}
          </DropdownMenuItem>
        );
      })}
      <p className="px-3 pb-2 pt-1 text-xs text-neutral-500">Nothing is deleted or switched off. Search finds every page in both views.</p>
    </DropdownMenu>
  );
}
