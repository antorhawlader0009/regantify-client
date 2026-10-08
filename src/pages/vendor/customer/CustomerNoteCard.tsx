import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import { customersApi, SUGGESTED_CUSTOMER_TAGS, type VendorCustomerDetail } from '../../../lib/customersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { productInputClass } from '../../../components/product/ProductFormPieces';

const MAX_TAGS = 10;

/** A customer's tags as small chips (Customers list, Customer Detail, Order detail). */
export function CustomerTagChips({ tags, onRemove }: { tags: string[]; onRemove?: (tag: string) => void }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900"
        >
          {tag}
          {onRemove && (
            <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove ${tag}`} className="text-amber-700 hover:text-amber-950">
              <X size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/**
 * Customer Detail's "Note & tags": the vendor's own note and tags on this customer, shown again at the
 * top of every order from this phone. `canEdit` false shows them read-only.
 */
export function CustomerNoteCard({ customer, canEdit }: { customer: VendorCustomerDetail; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(customer.note ?? '');
  const [tags, setTags] = useState<string[]>(customer.tags);
  const [draft, setDraft] = useState('');
  const { data: storeTags } = useQuery({ queryKey: ['customer-tags'], queryFn: customersApi.listTags, enabled: canEdit });

  useEffect(() => {
    setNote(customer.note ?? '');
    setTags(customer.tags);
  }, [customer.note, customer.tags]);

  const save = useMutation({
    mutationFn: () => customersApi.setNote(customer.phone, { note, tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      toast.success('Note and tags saved');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t save the note. Please try again.')),
  });

  const has = (tag: string) => tags.some((t) => t.toLowerCase() === tag.toLowerCase());
  const addTag = (raw: string) => {
    const tag = raw.replace(/\s+/g, ' ').trim().slice(0, 30);
    if (!tag || has(tag)) return;
    if (tags.length >= MAX_TAGS) {
      toast.error(`A customer can have at most ${MAX_TAGS} tags.`);
      return;
    }
    setTags([...tags, tag]);
    setDraft('');
  };

  const changed = note.trim() !== (customer.note ?? '').trim() || tags.join('\n') !== customer.tags.join('\n');
  // Tags this store already uses plus the ready-made ones, minus what this customer has.
  const suggestions = [...new Set([...(storeTags ?? []).map((t) => t.tag), ...SUGGESTED_CUSTOMER_TAGS])].filter((t) => !has(t)).slice(0, 8);

  if (!canEdit) {
    if (!customer.note && customer.tags.length === 0) return null;
    return (
      <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">Note & tags</h2>
        <CustomerTagChips tags={customer.tags} />
        {customer.note && <p className="mt-2 whitespace-pre-line text-sm text-regantify-text">{customer.note}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <h2 className="mb-1 text-[15px] font-semibold text-regantify-text">Note & tags</h2>
      <p className="mb-3 text-xs text-neutral-500">Only your team sees these. They show at the top of every order from this customer.</p>

      <CustomerTagChips tags={tags} onRemove={(tag) => setTags(tags.filter((t) => t !== tag))} />
      <form
        className={`flex gap-2 ${tags.length > 0 ? 'mt-2' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          addTag(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={30}
          placeholder="Add a tag, e.g. VIP"
          className={productInputClass}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Add tag"
          className="shrink-0 rounded-lg border border-line px-2.5 text-regantify-text hover:bg-neutral-50 disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 hover:border-neutral-400 hover:text-regantify-text"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="e.g. Office address, deliver after 2 PM"
        className={`${productInputClass} mt-3 resize-y`}
      />

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={!changed || save.isPending}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-50"
      >
        {save.isPending && <Loader2 size={14} className="animate-spin" />}
        Save
      </button>
    </section>
  );
}
