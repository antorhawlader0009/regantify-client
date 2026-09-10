import { useEffect, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { ALL_ORDER_STATUSES, DEFAULT_TABS, orderStatusLabel } from './orderStatus';
import type { OrderStatus } from '../../../lib/ordersApi';

interface CustomizeTabsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTabs: OrderStatus[];
  onSave: (statuses: OrderStatus[]) => void;
  saving: boolean;
}

// The four statuses always offered as the "pin/unpin with a switch" set
// at the top — everything else lives in the plain checkbox grid below,
// matching the reference's split between "Pending/Processing/Shipping/
// Completed" (with toggles) and "Available Statuses" (plain checkboxes).
const PINNABLE = DEFAULT_TABS;

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
    <Dialog open={open} onOpenChange={onOpenChange} title="Customize Order Status Tabs" maxWidth="max-w-lg">
      <div className="p-6 space-y-5">
        <p className="text-sm text-regantify-text-muted -mt-2">
          Select and reorder the status tabs you want to display:
        </p>

        <label className="flex items-center gap-2 text-sm font-medium text-regantify-text opacity-60">
          <input type="checkbox" checked disabled className="rounded" />
          All (Always shown)
        </label>

        <div className="space-y-2">
          {PINNABLE.map((status) => {
            const checked = selected.includes(status);
            return (
              <div
                key={status}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-black/10"
              >
                <label className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggle(status)} className="rounded" />
                  {orderStatusLabel(status)}
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  onClick={() => toggle(status)}
                  className={`w-9 h-5 rounded-full relative transition-colors ${
                    checked ? 'bg-regantify-cta' : 'bg-black/15'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      checked ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-black/5 pt-4">
          <p className="text-sm font-medium text-regantify-text mb-3">Available Statuses:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {otherStatuses.map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 text-sm text-regantify-text cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(status)}
                  onChange={() => toggle(status)}
                  className="rounded"
                />
                {orderStatusLabel(status)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/5">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(selected)}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Tabs'}
        </button>
      </div>
    </Dialog>
  );
}
