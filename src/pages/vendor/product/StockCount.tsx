import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, ScanLine } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, TableFooter, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { Dialog } from '../../../components/ui/Dialog';
import { stockCountApi, type CountLine, type CountProduct, type CountRow } from '../../../lib/stockCountApi';
import { useAuthStore } from '../../../store/authStore';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const inputClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';
const keyOf = (r: Pick<CountRow, 'productId' | 'variantId'>) => `${r.productId}:${r.variantId ?? ''}`;

/** A count in progress: what was typed, and the stock the system showed when each line was first counted. */
interface Draft {
  counts: Record<string, string>;
  expected: Record<string, number>;
  /** For the review list: names stay readable after the page changes. */
  labels: Record<string, string>;
}
const EMPTY_DRAFT: Draft = { counts: {}, expected: {}, labels: {} };

function loadDraft(userId: string): Draft {
  try {
    const raw = JSON.parse(localStorage.getItem(`regantify-stock-count:${userId}`) ?? 'null');
    if (raw && typeof raw === 'object' && raw.counts && raw.expected) return { counts: raw.counts, expected: raw.expected, labels: raw.labels ?? {} };
  } catch {
    // A broken draft is no draft.
  }
  return EMPTY_DRAFT;
}

/**
 * Product > Stock count (TellMe idea 31): count the shelf, type what you found next to each product, and apply. The
 * difference from the system's number shows at once; only lines that differ change anything. Because sales go on while
 * you count, each line remembers the stock the system showed when you first typed it, and applying moves stock by the
 * difference from THAT number: a sale made meanwhile is kept, not overwritten. A count in progress is kept in this
 * browser, so a refresh or a break doesn't lose it. Every change lands in the stock history with your name.
 */
export default function StockCount() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id) ?? '';
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [draft, setDraft] = useState<Draft>(() => loadDraft(userId));
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState('');
  const focusAfterLoad = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Keep the draft across a refresh.
  useEffect(() => {
    try {
      if (Object.keys(draft.counts).length === 0) localStorage.removeItem(`regantify-stock-count:${userId}`);
      else localStorage.setItem(`regantify-stock-count:${userId}`, JSON.stringify(draft));
    } catch {
      // Storage blocked: the count just isn't kept over a refresh.
    }
  }, [draft, userId]);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-count', term, page, perPage],
    queryFn: () => stockCountApi.list({ search: term || undefined, page, perPage }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];

  // After a scan + Enter: jump to the first count box of what was found.
  useEffect(() => {
    if (!focusAfterLoad.current || isLoading || !listRef.current) return;
    focusAfterLoad.current = false;
    listRef.current.querySelector<HTMLInputElement>('input[data-count]')?.focus();
  }, [items, isLoading]);

  function setCount(product: CountProduct, row: CountRow, value: string) {
    const clean = value.replace(/\D/g, '').slice(0, 8);
    const key = keyOf(row);
    setDraft((d) => {
      const counts = { ...d.counts };
      const expected = { ...d.expected };
      const labels = { ...d.labels };
      if (clean === '') {
        delete counts[key];
        delete expected[key];
        delete labels[key];
      } else {
        counts[key] = clean;
        // The system's number when counting this line began; not changed by later reloads.
        if (!(key in expected)) expected[key] = row.stock;
        labels[key] = `${product.name}${row.variantLabel ? ` · ${row.variantLabel}` : ''}`;
      }
      return { counts, expected, labels };
    });
  }

  const lines = useMemo(() => {
    const out: (CountLine & { key: string; label: string; diff: number })[] = [];
    for (const key of Object.keys(draft.counts)) {
      const [productId, variantId] = key.split(':');
      const counted = Number(draft.counts[key]);
      const expected = draft.expected[key] ?? 0;
      out.push({ key, productId, variantId: variantId || undefined, expected, counted, label: draft.labels[key] ?? key, diff: counted - expected });
    }
    return out;
  }, [draft]);
  const differing = lines.filter((l) => l.diff !== 0);
  const added = differing.filter((l) => l.diff > 0).reduce((n, l) => n + l.diff, 0);
  const removed = differing.filter((l) => l.diff < 0).reduce((n, l) => n - l.diff, 0);

  const apply = useMutation({
    mutationFn: () => stockCountApi.apply(differing.map(({ productId, variantId, expected, counted }) => ({ productId, variantId, expected, counted })), note),
    onSuccess: (res) => {
      toast.success(`Stock updated: ${res.changed} ${res.changed === 1 ? 'line' : 'lines'} changed (+${res.unitsAdded}, −${res.unitsRemoved}).`);
      setDraft(EMPTY_DRAFT);
      setNote('');
      setReviewing(false);
      for (const key of [['stock-count'], ['products'], ['low-stock'], ['stock-history'], ['dashboard']]) void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Couldn’t apply the count. Nothing was changed.')),
  });

  return (
    <PageSection>
      <PageHeader
        title="Stock count"
        description="Count the shelf, type what you found, and apply. Only the products that differ change, and each change is written to the stock history with your name."
        actions={
          <Link to="/vendor/product/stock-history" className={outlineBtn}>
            Stock history
          </Link>
        }
      />

      <div className="relative mb-4 max-w-md">
        <ScanLine size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              setTerm(search.trim());
              focusAfterLoad.current = true;
            }
          }}
          placeholder="Search a name, or scan a barcode and press Enter"
          aria-label="Find a product to count"
          className={`${inputClass} w-full pl-9`}
        />
      </div>

      <div ref={listRef}>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No products to count" hint="Products with unlimited stock have nothing to count. Try another search." />
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <div key={p.id} className="rounded-xl border border-line bg-white">
                <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
                  {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-md border border-line object-cover" /> : <span className="h-10 w-10 rounded-md bg-neutral-100" />}
                  <div className="min-w-0">
                    <Link to={`/vendor/product/edit/${p.id}#stock`} className="block truncate text-sm font-medium text-brand hover:underline">
                      {p.name}
                    </Link>
                    {p.category && <p className="text-xs text-neutral-500">{p.category}</p>}
                  </div>
                </div>
                <ul className="divide-y divide-line">
                  {p.rows.map((row) => {
                    const key = keyOf(row);
                    const typed = draft.counts[key];
                    const expected = draft.expected[key] ?? row.stock;
                    const diff = typed === undefined ? 0 : Number(typed) - expected;
                    const moved = typed !== undefined && row.stock !== expected;
                    return (
                      <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-2">
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="truncate text-regantify-text">{row.variantLabel ?? 'Stock'}</p>
                          <p className="text-xs text-neutral-500">SKU {row.sku}</p>
                        </div>
                        <div className="w-24 text-right text-sm tabular-nums text-neutral-600">
                          <span className="block text-[11px] uppercase tracking-wide text-neutral-400">System</span>
                          {row.stock}
                          {moved && <span className="block text-[11px] text-amber-700">was {expected} when you began</span>}
                        </div>
                        <div className="w-24">
                          <span className="block text-[11px] uppercase tracking-wide text-neutral-400">Counted</span>
                          <input
                            data-count
                            inputMode="numeric"
                            value={typed ?? ''}
                            onChange={(e) => setCount(p, row, e.target.value)}
                            placeholder="—"
                            aria-label={`Counted ${p.name}${row.variantLabel ? ` ${row.variantLabel}` : ''}`}
                            className={`${inputClass} w-24 text-right tabular-nums`}
                          />
                        </div>
                        <div className="w-14 text-right">
                          {typed !== undefined && (
                            <span className={`inline-block min-w-[2.5rem] rounded-full px-2 py-0.5 text-center text-[12px] font-semibold ${diff === 0 ? 'bg-neutral-100 text-neutral-500' : diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {diff > 0 ? '+' : ''}
                              {diff}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && data.total > 0 && <TableFooter page={page} perPage={perPage} total={data.total} onPageChange={setPage} onPerPageChange={(n) => { setPerPage(n); setPage(1); }} />}

      {lines.length > 0 && (
        <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-lg">
          <p className="text-sm text-neutral-700">
            <span className="font-medium">{lines.length}</span> counted, <span className="font-medium">{differing.length}</span> {differing.length === 1 ? 'differs' : 'differ'}
            {differing.length > 0 && (
              <span className="text-neutral-500">
                {' '}
                (+{added} / −{removed} pieces)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDraft(EMPTY_DRAFT)} className={outlineBtn}>
              Discard count
            </button>
            <button type="button" onClick={() => setReviewing(true)} disabled={differing.length === 0} className={primaryBtn}>
              Review and apply
            </button>
          </div>
        </div>
      )}

      <Dialog open={reviewing} onOpenChange={setReviewing} title="Apply this count?" maxWidth="max-w-lg">
        <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
          <p className="text-neutral-600">
            {differing.length} {differing.length === 1 ? 'product changes' : 'products change'}. If something was sold while you counted, that sale is kept.
          </p>
          <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {differing.map((l) => (
              <li key={l.key} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate">{l.label}</span>
                <span className="shrink-0 tabular-nums text-neutral-600">
                  {l.expected} → {l.counted}{' '}
                  <b className={l.diff > 0 ? 'text-emerald-700' : 'text-red-700'}>
                    ({l.diff > 0 ? '+' : ''}
                    {l.diff})
                  </b>
                </span>
              </li>
            ))}
          </ul>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="Note (optional), e.g. shelf A, Friday" aria-label="Note" className={`${inputClass} w-full`} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setReviewing(false)} className={outlineBtn}>
              Back
            </button>
            <button type="button" onClick={() => apply.mutate()} disabled={apply.isPending} className={primaryBtn}>
              {apply.isPending ? 'Applying…' : 'Apply count'}
            </button>
          </div>
        </div>
      </Dialog>
    </PageSection>
  );
}
