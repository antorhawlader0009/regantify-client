import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { productsApi } from '../../lib/productsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { productInputClass } from './ProductFormPieces';

/**
 * A product's barcode (POS-system-plan.md Step 2): type or scan the maker's
 * code, or "Generate" an in-store one for your own goods. Spaces are
 * dropped as you type, since a barcode never has any.
 */
export function BarcodeInput({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const [code] = await productsApi.generateBarcodes(1);
      if (code) onChange(code);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't make a barcode. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\s+/g, '').slice(0, 48))}
        // A scanner types the code and presses Enter; don't let that Enter submit the form.
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault();
        }}
        placeholder="Scan or type"
        maxLength={48}
        autoComplete="off"
        spellCheck={false}
        className={`${productInputClass} flex-1 font-mono`}
      />
      <button
        type="button"
        onClick={generate}
        disabled={busy || value.trim() !== ''}
        title={value.trim() ? 'Clear the field to make a new one' : 'Make a barcode for a product that has none'}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wand2 size={15} aria-hidden />
        {busy ? 'Making…' : 'Generate'}
      </button>
    </div>
  );
}
