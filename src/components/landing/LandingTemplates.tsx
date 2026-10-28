import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clapperboard, LayoutGrid, LayoutTemplate, ShoppingBag, X } from 'lucide-react';
import { productsApi } from '../../lib/productsApi';
import { landingPagesApi } from '../../lib/landingPagesApi';
import { buildLandingTemplate, LANDING_TEMPLATES, type LandingTemplate, type LandingTemplateId } from '../../lib/landingTemplates';
import { toast } from '../../lib/toast';
import { ProductPickerField } from './ProductPickerField';

const ICONS: Record<LandingTemplateId, typeof ShoppingBag> = {
  'single-offer': ShoppingBag,
  'video-story': Clapperboard,
  'multi-product': LayoutGrid,
};

/**
 * Store > Landing Pages > "Ready-made pages": the three layouts in lib/landingTemplates.ts, always on the page. Picking
 * one asks which product(s) it is for (the newest public ones are picked already), then makes a normal DRAFT landing
 * page and opens it in the builder, where every part can be changed. Nothing exists until the store picks one, so a
 * plan that allows a single landing page is not used up by pages the store never asked for.
 */
export function LandingTemplates() {
  const [picked, setPicked] = useState<LandingTemplate | null>(null);

  return (
    <section className="mb-7">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold text-regantify-text">Ready-made pages</h2>
        <p className="mt-0.5 text-[13px] text-regantify-text-muted">Start from a tested layout. Your product is filled in, and you can change everything after.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {LANDING_TEMPLATES.map((t) => {
          const Icon = ICONS[t.id];
          return (
            <div key={t.id} className="flex flex-col rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-regantify-text">{t.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-regantify-text-muted">{t.description}</p>
                </div>
              </div>
              <ol className="mt-3 flex flex-1 flex-wrap content-start gap-1.5 p-0">
                {t.outline.map((part, i) => (
                  <li key={part} className="list-none rounded-md bg-neutral-50 px-2 py-0.5 text-[11.5px] text-neutral-600">
                    {i + 1}. {part}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12px] text-regantify-text-muted">Good for: {t.bestFor}</p>
              <button
                type="button"
                onClick={() => setPicked(t)}
                className="mt-3 rounded-xl border border-regantify-cta px-3 py-2 text-[13px] font-medium text-regantify-cta transition-colors hover:bg-regantify-cta hover:text-white"
              >
                Use this page
              </button>
            </div>
          );
        })}
      </div>
      {picked && <UseTemplateDialog template={picked} onClose={() => setPicked(null)} />}
    </section>
  );
}

function UseTemplateDialog({ template, onClose }: { template: LandingTemplate; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['products', 'ai-generate-picker'],
    queryFn: () => productsApi.list({ perPage: 200 }),
  });
  const products = useMemo(() => data?.products ?? [], [data]);
  const [ids, setIds] = useState<string[] | null>(null);

  // The newest public products start picked, so most stores only press "Create page".
  useEffect(() => {
    if (ids !== null || !data) return;
    const visible = products.filter((p) => p.visibility === 'PUBLIC');
    setIds((visible.length ? visible : products).slice(0, template.maxProducts).map((p) => p.id));
  }, [data, products, ids, template.maxProducts]);

  const chosen = (ids ?? []).map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p);

  const create = useMutation({
    mutationFn: () => {
      const built = buildLandingTemplate(template.id, chosen);
      return landingPagesApi.create({ title: built.title, sections: built.sections });
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success('Page made as a draft. Check it, then publish.');
      navigate(`/vendor/store/landing-pages/${page.id}/builder`);
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not make the page. Please try again.';
      toast.error(message);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold text-regantify-text">
            <LayoutTemplate size={16} className="text-neutral-500" />
            {template.name}
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-regantify-text" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-[13px] text-regantify-text-muted">Loading your products…</p>
          ) : products.length === 0 ? (
            <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-[13px] text-regantify-text-muted">
              You have no products yet. The page will be made without one; pick the product in the builder later.
            </p>
          ) : (
            <ProductPickerField
              value={ids ?? []}
              onChange={(next) => setIds(next.slice(0, template.maxProducts))}
              multiple={template.maxProducts > 1}
              label={template.maxProducts > 1 ? `Products (up to ${template.maxProducts})` : 'Product'}
            />
          )}
          <p className="text-[12.5px] text-regantify-text-muted">
            The page is saved as a draft and opens in the builder. Its photos, name and price come from the product. Add your customers&apos; real reviews in the
            reviews part; it stays hidden until you do.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-[13px] font-medium text-regantify-text hover:bg-neutral-100">
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || isLoading}
            className="rounded-xl bg-regantify-cta px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60"
          >
            {create.isPending ? 'Making the page…' : 'Create page'}
          </button>
        </div>
      </div>
    </div>
  );
}
