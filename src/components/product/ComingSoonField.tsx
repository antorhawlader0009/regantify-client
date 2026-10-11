/**
 * Coming soon (TellMe idea 104): the product shows in your store with its photos and "Coming soon" instead of a price and Buy, with a
 * "Notify me" form for a phone number. Checkout refuses it. Switch it off (or let the expected day pass) and everyone who asked gets one
 * SMS from your SMS credits. The product must be Public to show.
 */
export function ComingSoonField({
  on,
  onToggle,
  until,
  onUntil,
  waiting,
}: {
  on: boolean;
  onToggle: (on: boolean) => void;
  until: string;
  onUntil: (v: string) => void;
  /** People on the waitlist (Edit Product only). */
  waiting?: number;
}) {
  return (
    <div className="mt-5 border-t border-line pt-5">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-regantify-text">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4 accent-regantify-cta" />
        Coming soon
      </label>
      <p className="mt-1 text-xs text-neutral-500">Shows the product without a price or Buy, with a “Notify me” form. Customers who ask get one SMS when it goes on sale. StorePal only.</p>
      {on && (
        <label className="mt-3 block text-xs text-neutral-500">
          Expected day (optional)
          <input type="date" value={until} onChange={(e) => onUntil(e.target.value)} className="mt-1 block h-10 rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text" />
          <span className="mt-1 block">On that day it goes on sale by itself and the waitlist is texted.</span>
        </label>
      )}
      {waiting !== undefined && waiting > 0 && (
        <p className="mt-2 text-sm font-medium text-regantify-text">
          {waiting} {waiting === 1 ? 'person is' : 'people are'} waiting for this product.
        </p>
      )}
    </div>
  );
}
