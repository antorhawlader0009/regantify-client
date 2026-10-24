import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, MapPin, Plus, Trash2 } from 'lucide-react';
import { SectionCard } from '../../../components/product/ProductFormPieces';
import { openUrlOf, shopLocationsApi, type ShopLocation, type ShopLocationInput } from '../../../lib/shopLocationsApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MAX_ITEMS = 20;
const inputClass = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

interface Row extends ShopLocationInput {
  key: string;
  /** The saved google.com address, to try the link before saving again. */
  savedUrl: string;
}

const newKey = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const toRow = (l: ShopLocation): Row => ({ key: l.id, id: l.id, name: l.name, address: l.address, phone: l.phone, hours: l.hours, mapLink: l.mapUrl, savedUrl: l.mapUrl });

/**
 * Store > Content > Shop Locations: the store's shops (up to 20). The store shows them on an "Our shops" page with a footer link; a tap opens
 * the shop on Google Maps, and "Directions" starts the route. A pasted Google Maps share link is checked by the server; with no link the
 * address is searched on Google Maps instead.
 */
export default function ShopLocations() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['shop-locations'], queryFn: shopLocationsApi.list });
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (data) setRows(data.map(toRow));
  }, [data]);

  const save = useMutation({
    mutationFn: () => shopLocationsApi.save(rows.map(({ id, name, address, phone, hours, mapLink }) => ({ id, name, address, phone, hours, mapLink }))),
    onSuccess: (saved) => {
      queryClient.setQueryData(['shop-locations'], saved);
      setRows(saved.map(toRow));
      toast.success('Shop locations saved. Your store will show them shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the shops. Please try again.')),
  });

  const set = (i: number, patch: Partial<Row>) => setRows((cur) => cur.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const move = (i: number, by: number) =>
    setRows((cur) => {
      const j = i + by;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => setRows((cur) => (cur.length >= MAX_ITEMS ? cur : [...cur, { key: newKey(), name: '', address: '', phone: '', hours: '', mapLink: '', savedUrl: '' }]));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Shop Locations</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Your shops or branches. Customers see them on your store’s “Our shops” page (linked in the footer), and one tap opens the shop on Google Maps with directions.
      </p>

      {isLoading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <SectionCard title="How to get your shop’s Google Maps link">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-700">
              <li>Open Google Maps and find your shop (or drop a pin on it).</li>
              <li>Tap <span className="font-medium">Share</span>, then <span className="font-medium">Copy link</span>.</li>
              <li>Paste it below. It looks like https://maps.app.goo.gl/…</li>
            </ol>
            <p className="mt-2 text-xs text-neutral-500">No link? Leave it empty: the store then searches your shop’s name and address on Google Maps.</p>
          </SectionCard>

          {rows.map((row, i) => (
            <div key={row.key} className="space-y-2 rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                  <MapPin size={15} aria-hidden />
                </span>
                <input type="text" maxLength={60} value={row.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Shop name, e.g. Gulshan branch" className={inputClass} />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded-lg border border-line p-2 text-neutral-600 disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down" className="rounded-lg border border-line p-2 text-neutral-600 disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))} aria-label="Remove" className="rounded-lg border border-line p-2 text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <input type="text" maxLength={200} value={row.address} onChange={(e) => set(i, { address: e.target.value })} placeholder="Address, e.g. House 12, Road 11, Gulshan 2, Dhaka" className={inputClass} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input type="tel" maxLength={20} value={row.phone} onChange={(e) => set(i, { phone: e.target.value })} placeholder="Phone (optional)" className={inputClass} />
                <input type="text" maxLength={80} value={row.hours} onChange={(e) => set(i, { hours: e.target.value })} placeholder="Open hours (optional), e.g. Sat-Thu 10am-9pm" className={inputClass} />
              </div>
              <input
                type="url"
                maxLength={2000}
                value={row.mapLink}
                onChange={(e) => set(i, { mapLink: e.target.value })}
                placeholder="Google Maps link (optional), e.g. https://maps.app.goo.gl/…"
                className={inputClass}
              />
              {(row.name.trim() || row.address.trim()) && (
                <a
                  href={row.savedUrl && row.mapLink === row.savedUrl ? row.savedUrl : openUrlOf({ name: row.name, address: row.address, mapUrl: '' })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-regantify-cta hover:underline"
                >
                  <ExternalLink size={12} aria-hidden />
                  {row.savedUrl && row.mapLink === row.savedUrl ? 'Check the saved map link' : 'Check where Google Maps finds this address'}
                </a>
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={add} disabled={rows.length >= MAX_ITEMS} className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-50">
              <Plus size={15} />
              Add a shop
            </button>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl bg-regantify-cta px-6 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60">
              {save.isPending ? 'Saving…' : 'Save shops'}
            </button>
            <span className="text-xs text-neutral-500">
              {rows.length} of {MAX_ITEMS}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
