import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { ALL_ORDER_STATUSES, DEFAULT_TABS, orderStatusLabel } from './orderStatus';
import type { OrderStatus } from '../../../lib/ordersApi';

interface CustomizeTabsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTabs: OrderStatus[];
  onSave: (statuses: OrderStatus[]) => void;
  saving: boolean;
}

// The four everyday statuses come first; the rest are listed below them.
const PINNABLE = DEFAULT_TABS;

function StatusChip({ status, checked, onToggle }: { status: OrderStatus; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors ${
        checked ? 'border-brand bg-brand-lime/30 text-regantify-text' : 'border-line text-neutral-600 hover:bg-neutral-50'
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-brand bg-brand text-white' : 'border-neutral-300 bg-white'
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span className="truncate">{orderStatusLabel(status)}</span>
    </button>
  );
}

export function CustomizeTabsModal({ open, onOpenChange, currentTabs, onSave, saving }: CustomizeTabsModalProps) {
  const [selected, setSelected] = useState<OrderStatus[]>(currentTabs);

  // Reset local selection to the server's current tabs whenever the
  // modal is (re)opened, so a previous unsaved edit doesn't linger.
  useEffect(() => {
    if (open) setSelected(currentTabs);
  }, [open, currentTabs]);

  const toggle = (status: OrderStatus) => {
    setSelected((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  };

  const otherStatuses = ALL_ORDER_STATUSES.filter((s) => !PINNABLE.includes(s));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Order tabs" maxWidth="max-w-lg">
      <div className="space-y-5 px-6 pb-2 pt-3">
        <p className="text-sm text-neutral-500">
          Pick the statuses that get their own tab on the Orders page. “All” is always there. Tabs show in the order you pick them.
        </p>

        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500">Everyday</p>
          <div className="grid grid-cols-2 gap-2">
            {PINNABLE.map((status) => (
              <StatusChip key={status} status={status} checked={selected.includes(status)} onToggle={() => toggle(status)} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500">Other statuses</p>
          <div className="grid grid-cols-2 gap-2">
            {otherStatuses.map((status) => (
              <StatusChip key={status} status={status} checked={selected.includes(status)} onToggle={() => toggle(status)} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-5 pt-4">
        <button
          type="button"
          onClick={() => setSelected(DEFAULT_TABS)}
          className="mr-auto text-sm text-neutral-500 underline-offset-2 hover:text-regantify-text hover:underline"
        >
          Reset to default
        </button>
        <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
          Cancel
        </button>
        <button type="button" onClick={() => onSave(selected)} disabled={saving} className={primaryBtn}>
          {saving ? 'Saving…' : `Save ${selected.length + 1} tabs`}
        </button>
      </div>
    </Dialog>
  );
}
