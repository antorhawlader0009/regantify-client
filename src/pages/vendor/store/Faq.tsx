import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard } from '../../../components/product/ProductFormPieces';
import { faqApi, type FaqItem } from '../../../lib/faqApi';
import { getVendorDeliveryCharges } from '../../../lib/vendorApi';
import { storeSettingsApi } from '../../../lib/storeSettingsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MAX_ITEMS = 20;
const inputClass = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

const newId = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Facts {
  insideDays: number | null;
  outsideDays: number | null;
  returnDays: number | null;
}

/** Ready questions (TellMe idea 122). The answers are filled from the store's own settings where it has them, and left to be written where it has not. */
function readyQuestions(f: Facts): Array<{ label: string; question: string; answer: string }> {
  const delivery =
    f.insideDays != null || f.outsideDays != null
      ? `<p>We deliver all over Bangladesh. ${f.insideDays != null ? `Inside Dhaka: about ${esc(String(f.insideDays))} working day(s). ` : ''}${f.outsideDays != null ? `Outside Dhaka: about ${esc(String(f.outsideDays))} working day(s).` : ''}</p>`
      : '<p></p>';
  const ret = f.returnDays != null ? `<p>You can return a product within ${esc(String(f.returnDays))} day(s) of getting it, if it is unused and in its original packing. Contact us and we will arrange it.</p>` : '<p></p>';
  return [
    { label: 'Delivery time', question: 'How long does delivery take?', answer: delivery },
    { label: 'Cash on delivery', question: 'Is Cash on Delivery available?', answer: '<p></p>' },
    { label: 'Returns', question: 'How can I return a product?', answer: ret },
    { label: 'Payment', question: 'How can I pay?', answer: '<p></p>' },
    { label: 'Tracking', question: 'How can I track my order?', answer: '<p>Open the tracking link we send you by SMS, or use “Track order” on our website with your order number and phone.</p>' },
  ];
}

/**
 * Store > Content > FAQ (TellMe idea 122): the store's questions and answers, up to 20, arranged with the arrows, each switched on or off. They show on a
 * /faq page, in a footer link, optionally as a home page section (Store > Design > Customize), and as FAQ data for Google. StorePal only.
 */
export default function Faq() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['faq'], queryFn: faqApi.list });
  const [items, setItems] = useState<FaqItem[]>([]);
  const [facts, setFacts] = useState<Facts>({ insideDays: null, outsideDays: null, returnDays: null });
  useEffect(() => {
    if (data) setItems(data);
  }, [data]);
  useEffect(() => {
    Promise.all([getVendorDeliveryCharges().catch(() => null), storeSettingsApi.getStock().catch(() => null)]).then(([charges, stock]) =>
      setFacts({ insideDays: charges?.insideDhakaDays ?? null, outsideDays: charges?.outsideDhakaDays ?? null, returnDays: stock?.defaultReturnDays ?? null }),
    );
  }, []);

  const save = useMutation({
    mutationFn: () => faqApi.save(items.filter((i) => i.question.trim() && i.answer.replace(/<[^>]*>/g, '').trim())),
    onSuccess: (saved) => {
      queryClient.setQueryData(['faq'], saved);
      setItems(saved);
      toast.success('FAQ saved. Your storefront will reflect this shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the FAQ. Please try again.')),
  });

  const set = (i: number, patch: Partial<FaqItem>) => setItems((cur) => cur.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const move = (i: number, by: number) =>
    setItems((cur) => {
      const j = i + by;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = (question = '', answer = '') => setItems((cur) => (cur.length >= MAX_ITEMS ? cur : [...cur, { id: newId(), question, answer, enabled: true }]));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">FAQ</h1>
      <p className="mb-6 text-sm text-neutral-600">
        The questions customers ask again and again, answered once. They show on your store’s FAQ page and in a footer link; add the “FAQ” section to your home page in Store &gt; Design &gt; Customize. Works on the StorePal theme only.
      </p>

      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <SectionCard title="Start from a ready question">
            <div className="flex flex-wrap gap-2">
              {readyQuestions(facts).map((q) => (
                <button key={q.label} type="button" disabled={items.length >= MAX_ITEMS} onClick={() => add(q.question, q.answer)} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-regantify-text hover:border-black/30 disabled:opacity-50">
                  + {q.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500">The delivery days and return days are taken from your store settings. Read each answer and change it to match how you really work.</p>
          </SectionCard>

          {items.map((item, i) => (
            <div key={item.id} className="space-y-2 rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2">
                <input type="text" maxLength={200} value={item.question} onChange={(e) => set(i, { question: e.target.value })} placeholder="Question" className={inputClass} />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-lg border border-line p-2 text-neutral-600 disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="rounded-lg border border-line p-2 text-neutral-600 disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => setItems((cur) => cur.filter((_, idx) => idx !== i))} aria-label="Remove" className="rounded-lg border border-line p-2 text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <RichTextEditor value={item.answer} onChange={(html) => set(i, { answer: html })} placeholder="Answer (links work)" />
              <label className="flex items-center gap-2 text-sm text-regantify-text">
                <input type="checkbox" checked={item.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} />
                Show this question on the store
              </label>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => add()} disabled={items.length >= MAX_ITEMS} className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-50">
              <Plus size={15} />
              Add a question
            </button>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl bg-regantify-cta px-6 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60">
              {save.isPending ? 'Saving…' : 'Save FAQ'}
            </button>
            <span className="text-xs text-neutral-500">{items.length} of {MAX_ITEMS}</span>
          </div>
        </div>
      )}
    </div>
  );
}
