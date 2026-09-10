import { useState } from 'react';
import { Calendar } from 'lucide-react';
import * as RadixPopover from '@radix-ui/react-popover';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
}

function formatLabel(dateFrom: string, dateTo: string) {
  if (!dateFrom && !dateTo) return 'All Dates';
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dateFrom && dateTo) return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
  if (dateFrom) return `From ${fmt(dateFrom)}`;
  return `Until ${fmt(dateTo)}`;
}

export function DateRangeFilter({ dateFrom, dateTo, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);

  return (
    <RadixPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraftFrom(dateFrom);
          setDraftTo(dateTo);
        }
      }}
    >
      <RadixPopover.Trigger asChild>
        <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
          <Calendar size={15} />
          {formatLabel(dateFrom, dateTo)}
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          className="w-72 bg-white rounded-xl shadow-lg border border-black/10 p-4 z-30 focus:outline-none"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">From</label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-regantify-text-muted mb-1">To</label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-between gap-2 mt-4">
            <button
              onClick={() => {
                setDraftFrom('');
                setDraftTo('');
                onChange('', '');
                setOpen(false);
              }}
              className="text-xs text-regantify-text-muted hover:text-regantify-text"
            >
              Clear
            </button>
            <button
              onClick={() => {
                onChange(draftFrom, draftTo);
                setOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-xs font-medium"
            >
              Apply
            </button>
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
