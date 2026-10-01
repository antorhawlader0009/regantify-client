import { useEffect, useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { productInputClass } from '../../../components/product/ProductFormPieces';

interface ChangeLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLabel: string | null | undefined;
  onSave: (label: string | null) => void;
  saving: boolean;
}

const SUGGESTIONS = ['VIP', 'Fragile', 'Urgent', 'Gift', 'Call first'];

export function ChangeLabelModal({ open, onOpenChange, currentLabel, onSave, saving }: ChangeLabelModalProps) {
  const [label, setLabel] = useState(currentLabel ?? '');

  useEffect(() => {
    if (open) setLabel(currentLabel ?? '');
  }, [open, currentLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Order label" maxWidth="max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(label.trim() || null);
        }}
      >
        <div className="px-6 pb-2 pt-3">
          <p className="mb-3 text-sm text-neutral-500">A short tag your team sees on the Orders list. Leave it empty to remove it.</p>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. VIP, Fragile"
            maxLength={60}
            autoFocus
            aria-label="Label"
            className={productInputClass}
          />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLabel(s)}
                className={`h-7 rounded-full border px-2.5 text-xs transition-colors ${
                  label === s ? 'border-brand-lime bg-brand-lime text-brand' : 'border-line text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5 pt-4">
          <button type="button" onClick={() => onOpenChange(false)} className={outlineBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Saving…' : 'Save label'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
