import { Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '../editor/RichTextEditor';
import { Field } from './ProductFormPieces';

export interface InfoTabRow {
  title: string;
  text: string;
}

const inputClass = 'h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';
const PRESETS = ['Ingredients', 'How to use', 'Care instructions', 'Warranty'];
const MAX_TABS = 3;

/**
 * "Extra information" (TellMe idea 119): up to 3 tabs on the product page, after the description (ingredients, how to use, care, warranty...). A tab with no title
 * or no text is not shown. Each text is up to 2,000 characters. StorePal only.
 */
export function InfoTabsField({ tabs, onChange }: { tabs: InfoTabRow[]; onChange: (tabs: InfoTabRow[]) => void }) {
  const set = (i: number, patch: Partial<InfoTabRow>) => onChange(tabs.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="text-sm font-medium text-regantify-text">Extra information tabs</p>
      <p className="mt-0.5 text-xs text-neutral-500">Optional. Up to {MAX_TABS} tabs next to the description, like Ingredients or How to use. Empty tabs are not shown.</p>
      <div className="mt-3 space-y-4">
        {tabs.map((tab, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Field label="Tab title">
                <input type="text" maxLength={30} value={tab.title} onChange={(e) => set(i, { title: e.target.value })} className={`${inputClass} w-56`} />
              </Field>
              <div className="flex flex-wrap items-center gap-1.5 pt-5">
                {PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => set(i, { title: p })} className="rounded-full border border-line px-2.5 py-1 text-xs text-regantify-text hover:border-black/30">
                    {p}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => onChange(tabs.filter((_, idx) => idx !== i))} className="ml-auto flex items-center gap-1 pt-5 text-xs text-red-600">
                <Trash2 size={14} />
                Remove
              </button>
            </div>
            <RichTextEditor value={tab.text} onChange={(html) => set(i, { text: html })} placeholder="Write the text for this tab…" />
          </div>
        ))}
      </div>
      {tabs.length < MAX_TABS && (
        <button type="button" onClick={() => onChange([...tabs, { title: '', text: '' }])} className="mt-3 flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50">
          <Plus size={15} />
          Add a tab
        </button>
      )}
    </div>
  );
}
