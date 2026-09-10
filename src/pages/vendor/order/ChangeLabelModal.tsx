import { useEffect, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';

interface ChangeLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLabel: string | null | undefined;
  onSave: (label: string | null) => void;
  saving: boolean;
}

export function ChangeLabelModal({ open, onOpenChange, currentLabel, onSave, saving }: ChangeLabelModalProps) {
  const [label, setLabel] = useState(currentLabel ?? '');

  useEffect(() => {
    if (open) setLabel(currentLabel ?? '');
  }, [open, currentLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Change Label" maxWidth="max-w-sm">
      <div className="p-6 pt-4">
        <label className="block text-sm font-medium text-regantify-text mb-1.5">Label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. VIP, Fragile, Priority"
          maxLength={60}
          className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
        />
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
          onClick={() => onSave(label.trim() || null)}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Label'}
        </button>
      </div>
    </Dialog>
  );
}
