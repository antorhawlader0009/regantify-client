import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, X, Package } from 'lucide-react';
import { productsApi } from '../../lib/productsApi';
import { landingPagesApi, type GenerateLandingPagePayload, type LandingPageSection } from '../../lib/landingPagesApi';
import { Field, TextArea, TextInput } from './fields';

type Goal = GenerateLandingPagePayload['goal'];

const GOALS: Array<{ value: Goal; label: string; description: string }> = [
  { value: 'sell-product', label: 'Sell this product', description: 'Ends with a Cash-on-Delivery order form.' },
  { value: 'collect-leads', label: 'Collect leads', description: 'Ends with a name/phone contact form.' },
  { value: 'promote-offer', label: 'Promote an offer', description: 'Leads with urgency/discount, then an order form.' },
];

/**
 * Store > Landing Pages > AI Generate (landing-plan.md §5, Step 10).
 * Deliberately does NOT persist anything itself - `onGenerated` hands the
 * drafted sections back to LandingPageBuilder, which appends them to the
 * current local draft (same "commit on Save" flow every other builder
 * edit already goes through). This is what makes AI Generate compose
 * naturally with an already-partially-built page rather than being an
 * all-or-nothing "start over" action.
 */
export function AiGenerateModal({
  onGenerated,
  onClose,
}: {
  onGenerated: (sections: LandingPageSection[]) => void;
  onClose: () => void;
}) {
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [productSummary, setProductSummary] = useState('');
  const [goal, setGoal] = useState<Goal>('sell-product');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['products', 'ai-generate-picker'],
    queryFn: () => productsApi.list({ perPage: 200 }),
  });
  const products = data?.products ?? [];
  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  const canGenerate = productId ? true : productName.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const draft = await landingPagesApi.generate(
        productId
          ? { productId, goal }
          : { productName: productName.trim(), productSummary: productSummary.trim() || undefined, goal },
      );
      onGenerated(draft.sections);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not generate a draft right now. Please try again.';
      setError(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-regantify-text">
            <Sparkles size={16} className="text-violet-600" />
            AI Generate
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-regantify-text" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-5">
          <Field
            label="Product"
            hint="Pick an existing product, or type a name/offer below if you haven't added one yet."
          >
            {selectedProduct ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-line bg-white p-2">
                {selectedProduct.photoUrls?.[0] ? (
                  <img src={selectedProduct.photoUrls[0]} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-neutral-50 text-neutral-400">
                    <Package size={15} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-neutral-700">{selectedProduct.name}</span>
                <button
                  onClick={() => setProductId(null)}
                  className="shrink-0 rounded px-2 py-1 text-[11px] text-neutral-500 hover:text-red-600"
                >
                  Change
                </button>
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => setProductId(e.target.value || null)}
                className="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[12.5px]
                  text-regantify-text [&>option]:bg-white focus:border-violet-400 focus:outline-none"
              >
                <option value="">No product selected - type name/offer below</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {!productId && (
            <>
              <Field label="Product name or offer">
                <TextInput value={productName} onChange={setProductName} placeholder="e.g. Wireless Bluetooth Earbuds" />
              </Field>
              <Field label="Short summary (optional)" hint="A sentence or two - helps the draft be more specific.">
                <TextArea value={productSummary} onChange={setProductSummary} rows={2} placeholder="e.g. Noise-cancelling, 30h battery, waterproof" />
              </Field>
            </>
          )}

          <Field label="Goal">
            <div className="flex flex-col gap-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    goal === g.value
                      ? 'border-violet-400/50 bg-violet-500/10'
                      : 'border-line bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  <span className="block text-[12.5px] font-medium text-regantify-text">{g.label}</span>
                  <span className="block text-[11px] text-neutral-400">{g.description}</span>
                </button>
              ))}
            </div>
          </Field>

          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            The draft never sets a real price or stock, and any customer reviews it writes are placeholders you
            must replace with real reviews before publishing.
          </p>

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <button onClick={onClose} className="rounded-lg px-3.5 py-2 text-[12.5px] text-neutral-500 hover:text-regantify-text">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-medium
              text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            <Sparkles size={14} />
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}
