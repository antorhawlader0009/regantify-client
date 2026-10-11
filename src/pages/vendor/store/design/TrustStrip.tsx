import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { TrustIcon, TrustStripItem, TrustStripSettings } from '../../../../lib/designSettingsApi';
import { DesignLoading, DesignPageHeader, DesignSection, SaveButton, Switch, inputClass, useDesignSettings } from './designShared';

const MAX_ITEMS = 4;
const ICONS: { value: TrustIcon; label: string }[] = [
  { value: 'truck', label: 'Delivery' },
  { value: 'return', label: 'Return' },
  { value: 'shield', label: 'Safe / warranty' },
  { value: 'support', label: 'Support' },
  { value: 'genuine', label: 'Genuine product' },
  { value: 'lock', label: 'Secure payment' },
  { value: 'cash', label: 'Cash on delivery' },
  { value: 'gift', label: 'Gift' },
];

/** The ready set, one click. Nothing in it is a promise until the owner has read and kept (or changed) every line. */
const READY_SET: TrustStripItem[] = [
  { icon: 'truck', title: 'Delivery all over Bangladesh', text: '' },
  { icon: 'return', title: 'Easy return', text: '' },
  { icon: 'lock', title: 'Secure payment', text: '' },
  { icon: 'genuine', title: 'Genuine products', text: '' },
];

const BLANK: TrustStripSettings = { enabled: false, items: [], product: true, checkout: true, home: false };

/**
 * Store > Design > Trust Strip (TellMe idea 130): up to four icon + title + one-line promises shown under the Buy button, near the payment choice at
 * checkout and, if wanted, at the bottom of the home page. Off by default. Shoppers read exactly what is written here, so write only what the store
 * really does: nothing is filled in on your behalf, and the ready set below only puts titles in for you to edit.
 */
export default function TrustStripPage() {
  const { settings, isLoading, save } = useDesignSettings();
  const [strip, setStrip] = useState<TrustStripSettings>(BLANK);

  useEffect(() => {
    if (settings?.trustStrip) setStrip(settings.trustStrip);
  }, [settings]);

  const setItem = (i: number, patch: Partial<TrustStripItem>) => setStrip((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));

  return (
    <div className="max-w-3xl">
      <DesignPageHeader title="Trust Strip" description="A short row of promises with icons that helps a shopper feel safe to buy." />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Show the strip" hint="Only on the StorePal store. Off until you turn it on.">
            <div className="flex items-center gap-3">
              <Switch checked={strip.enabled} onChange={(enabled) => setStrip((s) => ({ ...s, enabled }))} label="Show the trust strip" />
              <span className="text-sm">{strip.enabled ? 'On' : 'Off'}</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {(
                [
                  ['product', 'Under the Buy button on the product page'],
                  ['checkout', 'Near the payment choice at checkout'],
                  ['home', 'At the bottom of the home page'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={strip[key]} onChange={(e) => setStrip((s) => ({ ...s, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>
          </DesignSection>

          <DesignSection title="Items" hint={`Up to ${MAX_ITEMS}. Write only what your store really does, such as the number of days to return.`}>
            <div className="space-y-3">
              {strip.items.map((it, i) => (
                <div key={i} className="grid gap-2 rounded-xl border border-black/10 p-3 sm:grid-cols-[150px_1fr_auto]">
                  <select value={it.icon} onChange={(e) => setItem(i, { icon: e.target.value as TrustIcon })} className={inputClass} aria-label="Icon">
                    {ICONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <div className="space-y-2">
                    <input value={it.title} maxLength={40} onChange={(e) => setItem(i, { title: e.target.value })} placeholder="Title, e.g. Delivery in 2-3 days" className={inputClass} />
                    <input value={it.text} maxLength={100} onChange={(e) => setItem(i, { text: e.target.value })} placeholder="One line (optional)" className={inputClass} />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setStrip((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }))}
                    className="self-start rounded-lg p-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {strip.items.length < MAX_ITEMS && (
                <button
                  type="button"
                  onClick={() => setStrip((s) => ({ ...s, items: [...s.items, { icon: 'shield', title: '', text: '' }] }))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
                >
                  <Plus size={14} /> Add item
                </button>
              )}
              <button
                type="button"
                onClick={() => setStrip((s) => ({ ...s, items: READY_SET }))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm hover:bg-black/5"
              >
                Use the ready set
              </button>
            </div>
            <p className="mt-2 text-xs text-regantify-text-muted">
              Items with an empty title are not saved. If a product already shows its own warranty and return lines, leave “Return” out here so the same line is not shown twice.
            </p>
            <SaveButton pending={save.isPending} onClick={() => save.mutate({ trustStrip: strip })} />
          </DesignSection>
        </div>
      )}
    </div>
  );
}
