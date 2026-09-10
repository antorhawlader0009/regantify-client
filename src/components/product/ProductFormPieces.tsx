import { type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

export function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <HelpCircle size={14} className="text-regantify-text-muted cursor-help" />
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block
          w-max max-w-[220px] bg-regantify-black text-white text-xs rounded-lg px-2.5 py-1.5 z-10"
      >
        {text}
      </span>
    </span>
  );
}

export function SectionCard({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-black/5 p-6">
      <h2 className="text-base font-semibold text-regantify-text mb-5">{title}</h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  required,
  tooltip,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  tooltip?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-regantify-text mb-1.5">
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {/* When required, every text-style input/select/textarea inside
          this field (at any nesting depth — e.g. the price fields' ৳
          prefix wrapper) gets a red border, so a vendor can see at a
          glance which fields still need filling in without touching
          every individual Field usage. Radio/checkbox inputs are
          excluded — a red border around a small circle reads as broken,
          not "required". */}
      <div
        className={
          required
            ? '[&_input:not([type="radio"]):not([type="checkbox"])]:border [&_input:not([type="radio"]):not([type="checkbox"])]:border-red-400 [&_select]:border [&_select]:border-red-400 [&_textarea]:border [&_textarea]:border-red-400'
            : undefined
        }
      >
        {children}
      </div>
      {hint && <p className="text-xs text-regantify-text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

// Used across the Add/Edit Product forms (General Information, Pricing,
// Stock, Variations) — a light grey fill so the input reads as an empty
// field to fill in. Distinct from regantify-content (the page's own
// background, #F1F1F1) and from regantify-search (the pink shade used
// for the Topbar search bar and most other forms in the app —
// deliberately left alone here so this change stays scoped to product
// forms only).
export const productInputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-[#E9E9E9] text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black text-sm';

export const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black text-sm';
